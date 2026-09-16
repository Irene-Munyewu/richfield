import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendCoachMessage, type ChatMessage } from '../../lib/coach';
import { colors, radius, shadow, spacing, typography } from '../../constants/theme';

const PROMPT_CHIPS = [
  'What should I focus on next?',
  'How do I close my skill gaps?',
  'Am I ready to apply for internships?',
];

export default function Coach() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next = [...messages, { role: 'user', content: trimmed } as ChatMessage];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const reply = await sendCoachMessage(next);
      setMessages([...next, { role: 'model', content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setMessages([...next, { role: 'model', content: `Sorry — ${message}` }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={typography.h2}>AI Career Coach</Text>
            <Text style={[typography.bodyMuted, styles.emptySubtitle]}>
              Ask anything about your career goal, skill gaps, or next steps.
            </Text>
            <View style={styles.chipsWrap}>
              {PROMPT_CHIPS.map((chip) => (
                <Pressable key={chip} style={styles.chip} onPress={() => send(chip)}>
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.modelBubble]}>
                <Text style={item.role === 'user' ? styles.userText : styles.modelText}>{item.content}</Text>
              </View>
            )}
          />
        )}

        {sending && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={typography.caption}> Coach is thinking…</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable style={styles.sendButton} onPress={() => send(input)} disabled={sending}>
            <Text style={styles.sendButtonText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  emptyState: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  emptySubtitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  chipsWrap: { gap: spacing.sm },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  chipText: { ...typography.body, fontWeight: '600' },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubble: { maxWidth: '85%', borderRadius: radius.md, padding: spacing.md },
  userBubble: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  modelBubble: { backgroundColor: colors.card, alignSelf: 'flex-start', ...shadow.card },
  userText: { ...typography.body, color: colors.textOnPrimary },
  modelText: { ...typography.body },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  sendButtonText: { ...typography.button },
});
