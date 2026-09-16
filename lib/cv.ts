import { File } from 'expo-file-system';
import { supabase } from './supabase';

export type CvAnalysisResult = {
  score: number;
  strengths: string[];
  gaps: string[];
  missingSkills: string[];
};

/** Opens the system file picker restricted to PDFs. Returns null if the user cancels. */
export async function pickCvFile(): Promise<File | null> {
  const pick = await File.pickFileAsync({ mimeTypes: 'application/pdf' });
  if (pick.canceled) return null;
  return pick.result;
}

/**
 * Uploads the CV to the private `cvs` Storage bucket (path: `${userId}/cv.pdf`),
 * sends it to Gemini via the ai-proxy Edge Function for scoring, and writes
 * the result onto the caller's own profiles row.
 */
export async function uploadAndAnalyzeCv(userId: string, file: File): Promise<CvAnalysisResult> {
  const path = `${userId}/cv.pdf`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('cvs').upload(path, arrayBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const base64 = await file.base64();
  const { data, error: invokeError } = await supabase.functions.invoke('ai-proxy', {
    body: { mode: 'cv_analysis', fileBase64: base64, mimeType: 'application/pdf' },
  });
  if (invokeError) throw new Error(`CV analysis failed: ${invokeError.message}`);
  if (data?.error) throw new Error(data.error);

  const result: CvAnalysisResult = {
    score: data.score ?? 0,
    strengths: data.strengths ?? [],
    gaps: data.gaps ?? [],
    missingSkills: data.missingSkills ?? [],
  };

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      cv_url: path,
      cv_score: result.score,
      cv_strengths: result.strengths,
      cv_gaps: result.gaps,
      cv_missing_skills: result.missingSkills,
    })
    .eq('id', userId);
  if (updateError) throw new Error(`Saving CV results failed: ${updateError.message}`);

  return result;
}
