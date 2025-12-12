import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import MenuButton from '@/components/ui/MenuButton';
import NavigationDrawer from '@/components/ui/NavigationDrawer';
import { useApi } from '@/app/lib/useApi';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

type SerializedMessage = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string; // ISO string for JSON serialization
};

const STORAGE_KEY = '@mixology:assistant_messages_v1';
const WELCOME_MESSAGE =
  "Hello! I'm your cocktail assistant. I can help you with cocktail recipes, ingredient suggestions, and drink recommendations. What would you like to know?";

// Sample questions for quick access
const SAMPLE_QUESTIONS = [
  "What can I make with my current ingredients?",
  "Suggest a cocktail for tonight",
  "What ingredients am I missing for a Mojito?",
  "How do I make a classic Old Fashioned?",
  "Recommend a refreshing summer drink",
];

// Helper functions
const createWelcomeMessage = (): Message => ({
  id: `welcome-${Date.now()}`,
  text: WELCOME_MESSAGE,
  isUser: false,
  timestamp: new Date(),
});

const serializeMessages = (msgs: Message[]): SerializedMessage[] =>
  msgs.map((msg) => ({ ...msg, timestamp: msg.timestamp.toISOString() }));

const deserializeMessages = (msgs: SerializedMessage[]): Message[] =>
  msgs.map((msg) => ({ ...msg, timestamp: new Date(msg.timestamp) }));

const scrollToBottom = (
  ref: React.RefObject<FlatList<any> | null>,
  animated = true,
) => {
  setTimeout(() => ref.current?.scrollToEnd({ animated }), 100);
};

// Helper to render formatted text (bold, lists, etc.)
const renderFormattedText = (text: string, isUser: boolean) => {
  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((paragraph, pIndex) => {
    const lines = paragraph.split('\n');
    
    return (
      <View key={pIndex} style={pIndex > 0 ? { marginTop: 12 } : {}}>
        {lines.map((line, lIndex) => {
          // Check if it's a bullet point
          const bulletMatch = line.match(/^[\s]*[-•*]\s+(.+)$/);
          if (bulletMatch) {
            return (
              <View
                key={lIndex}
                style={{
                  flexDirection: 'row',
                  marginTop: lIndex > 0 ? 6 : 0,
                  paddingLeft: 8,
                }}
              >
                <Text
                  style={{
                    color: isUser ? '#FFFFFF' : Colors.textPrimary,
                    fontSize: 15,
                    marginRight: 8,
                  }}
                >
                  •
                </Text>
                <Text
                  style={{
                    flex: 1,
                    color: isUser ? '#FFFFFF' : Colors.textPrimary,
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  {renderInlineFormatting(bulletMatch[1], isUser)}
                </Text>
              </View>
            );
          }
          
          // Check if it's a bold heading (starts with **)
          const boldMatch = line.match(/^\*\*(.+?)\*\*$/);
          if (boldMatch) {
            return (
              <Text
                key={lIndex}
                style={{
                  color: isUser ? '#FFFFFF' : Colors.textPrimary,
                  fontSize: 16,
                  fontWeight: '700',
                  marginTop: lIndex > 0 ? 8 : 0,
                  marginBottom: 4,
                }}
              >
                {boldMatch[1]}
              </Text>
            );
          }
          
          // Regular line with inline formatting
          if (line.trim()) {
            return (
              <Text
                key={lIndex}
                style={{
                  color: isUser ? '#FFFFFF' : Colors.textPrimary,
                  fontSize: 15,
                  lineHeight: 22,
                  marginTop: lIndex > 0 ? 4 : 0,
                }}
              >
                {renderInlineFormatting(line, isUser)}
              </Text>
            );
          }
          
          return null;
        })}
      </View>
    );
  });
};

// Helper to render inline formatting (bold text)
const renderInlineFormatting = (
  text: string,
  isUser: boolean,
): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add bold text
    parts.push(
      <Text
        key={match.index}
        style={{
          fontWeight: '700',
          color: isUser ? '#FFFFFF' : Colors.textPrimary,
        }}
      >
        {match[1]}
      </Text>
    );
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? <>{parts}</> : text;
};

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { post } = useApi();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigation drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Load messages from AsyncStorage on mount
  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SerializedMessage[];
          setMessages(deserializeMessages(parsed));
          scrollToBottom(flatListRef, false);
        } else {
          const welcomeMessage = createWelcomeMessage();
          setMessages([welcomeMessage]);
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(serializeMessages([welcomeMessage])),
          );
        }
      } catch (e) {
        console.warn('Failed to load assistant messages:', e);
      } finally {
        setLoadingMessages(false);
      }
    })();
  }, []);

  // Save messages to AsyncStorage when they change
  useEffect(() => {
    if (loadingMessages) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(serializeMessages(messages)),
          );
        } catch (e) {
          console.warn('Failed to save assistant messages:', e);
        }
      })();
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, loadingMessages]);

  // Clear chat and reset to welcome message
  const handleClearChat = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      const welcomeMessage = createWelcomeMessage();
      setMessages([welcomeMessage]);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(serializeMessages([welcomeMessage])),
      );
      setTimeout(
        () =>
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
        100,
      );
    } catch (e) {
      console.warn('Failed to clear chat:', e);
    }
  };

  // Generate fallback mock response if API fails
  const generateMockResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // Simple keyword-based responses
    if (
      lowerMessage.includes('hello') ||
      lowerMessage.includes('hi') ||
      lowerMessage.includes('hey')
    ) {
      return "Hello! I'm your cocktail assistant. How can I help you today?";
    }
    if (
      lowerMessage.includes('recipe') ||
      lowerMessage.includes('drink') ||
      lowerMessage.includes('cocktail')
    ) {
      return "I'd be happy to help you find a cocktail recipe! What ingredients do you have on hand, or what type of drink are you in the mood for?";
    }
    if (
      lowerMessage.includes('ingredient') ||
      lowerMessage.includes('what can i make')
    ) {
      return 'Tell me what ingredients you have, and I can suggest some great cocktails you can make with them!';
    }
    if (
      lowerMessage.includes('recommend') ||
      lowerMessage.includes('suggestion')
    ) {
      return "I'd love to recommend a cocktail! What's your preference - something sweet, sour, strong, or refreshing?";
    }
    if (lowerMessage.includes('how') && lowerMessage.includes('make')) {
      return 'I can walk you through making a cocktail step by step! Which cocktail would you like to learn how to make?';
    }
    // Default response
    return "That's interesting! I'm here to help with cocktail recipes, ingredient suggestions, and drink recommendations. What would you like to know?";
  };

  const handleSend = async (message?: string) => {
    const messageToSend = message || inputText.trim();
    if (messageToSend === '' || isLoading) return;

    const userMessage = messageToSend.trim();
    const newMessage: Message = {
      id: Date.now().toString(),
      text: userMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom(flatListRef);

    try {
      // Build conversation history from previous messages (excluding welcome message)
      const conversationHistory = messages
        .filter((msg) => msg.id !== messages[0]?.id || !msg.text.includes('Hello!'))
        .map((msg) => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text,
        }));

      // Call backend API (pantry ingredients are now loaded from database)
      const response = await post<{ message: string; success: boolean }>(
        '/assistant/chat',
        {
          message: userMessage,
          conversation_history: conversationHistory,
        },
      );

      const assistantResponse: Message = {
        id: `${Date.now() + 1}`,
        text: response.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantResponse]);
      scrollToBottom(flatListRef);
    } catch (error: any) {
      console.error('Assistant API error:', error);
      
      // Fallback to mock response on error
      const assistantResponse: Message = {
        id: `${Date.now() + 1}`,
        text: generateMockResponse(userMessage),
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantResponse]);
      
      // Show error alert only for non-auth errors
      if (error?.status !== 401 && error?.status !== 403) {
        Alert.alert(
          'Connection Error',
          'Unable to reach the assistant. Using fallback response.',
          [{ text: 'OK' }],
        );
      }
      
      scrollToBottom(flatListRef);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      {!item.isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={16} color={Colors.accentPrimary} />
          </View>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {!item.isUser ? (
          <View style={styles.formattedTextContainer}>
            {renderFormattedText(item.text, item.isUser)}
          </View>
        ) : (
          <Text
            style={[
              styles.messageText,
              item.isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.text}
          </Text>
        )}
      </View>
      {item.isUser && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.userAvatar]}>
            <Ionicons name="person" size={14} color={Colors.textPrimary} />
          </View>
        </View>
      )}
    </View>
  );

  // Animate typing dots when loading
  useEffect(() => {
    if (isLoading) {
      const animateDot = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        );
      };

      const anim1 = animateDot(dot1Anim, 0);
      const anim2 = animateDot(dot2Anim, 200);
      const anim3 = animateDot(dot3Anim, 400);

      anim1.start();
      anim2.start();
      anim3.start();

      return () => {
        anim1.stop();
        anim2.stop();
        anim3.stop();
        dot1Anim.setValue(0);
        dot2Anim.setValue(0);
        dot3Anim.setValue(0);
      };
    }
  }, [isLoading, dot1Anim, dot2Anim, dot3Anim]);

  const renderTypingIndicator = () => {
    if (!isLoading) return null;
    const createDotOpacity = (anim: Animated.Value) =>
      anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

    return (
      <View style={[styles.messageContainer, styles.assistantMessage]}>
        <View
          style={[
            styles.messageBubble,
            styles.assistantBubble,
            styles.typingBubble,
          ]}
        >
          <View style={styles.typingDots}>
            {[dot1Anim, dot2Anim, dot3Anim].map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.typingDot,
                  {
                    backgroundColor: Colors.textSecondary,
                    opacity: createDotOpacity(anim),
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Menu handlers
  const handleMenuPress = useCallback(() => {
    setDrawerVisible(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Menu button overlay */}
        <View style={[styles.menuWrap, { top: Math.max(14, insets.top) }]}>
          <MenuButton onPress={handleMenuPress} />
        </View>

        {/* Fixed header */}
        <View style={[styles.headerWrap, { paddingTop: insets.top + 56 }]}>
          <Text style={styles.title}>Assistant</Text>
          {/* Clear chat button */}
          {messages.length > 0 && !loadingMessages && (
            <Pressable
              onPress={() => setShowClearDialog(true)}
              accessibilityRole="button"
              accessibilityLabel="Clear chat"
              hitSlop={12}
              style={[styles.clearButton, { top: Math.max(14, insets.top) }]}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={Colors.textSecondary}
              />
            </Pressable>
          )}
        </View>

        {/* Messages area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: insets.bottom + 20 },
          ]}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            loadingMessages ? null : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons
                    name="sparkles"
                    size={56}
                    color={Colors.accentPrimary}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  Your Cocktail Assistant
                </Text>
                <Text style={styles.emptyText}>
                  Ask me anything about cocktails, recipes, or ingredients!
                </Text>
                <View style={styles.sampleQuestionsContainer}>
                  <Text style={styles.sampleQuestionsTitle}>
                    Try asking:
                  </Text>
                  <View style={styles.sampleQuestionsGrid}>
                    {SAMPLE_QUESTIONS.map((question, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.sampleQuestionChip}
                        onPress={() => {
                          void handleSend(question);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.sampleQuestionText}>
                          {question}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )
          }
          ListFooterComponent={renderTypingIndicator}
        />

        {/* Input area */}
        <View
          style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom + 100, 100) }]}
        >
          {/* Show sample questions if only welcome message exists */}
          {messages.length === 1 && messages[0]?.text.includes('Hello!') && (
            <View style={styles.quickQuestionsContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickQuestionsScroll}
              >
                {SAMPLE_QUESTIONS.slice(0, 3).map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickQuestionChip}
                    onPress={() => {
                      void handleSend(question);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickQuestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask me anything about cocktails..."
              placeholderTextColor={Colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              maxLength={500}
              onSubmitEditing={() => {
                if (inputText.trim() && !isLoading) {
                  void handleSend();
                }
              }}
              returnKeyType="send"
              enablesReturnKeyAutomatically={true}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (inputText.trim() === '' || isLoading) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={() => {
                void handleSend();
              }}
              disabled={inputText.trim() === '' || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.textSecondary} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={
                    inputText.trim() === ''
                      ? Colors.textSecondary
                      : Colors.textPrimary
                  }
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Clear chat confirmation dialog */}
      <ConfirmDialog
        visible={showClearDialog}
        title="Clear Chat"
        message="Are you sure you want to clear all messages? This cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        onConfirm={() => {
          setShowClearDialog(false);
          void handleClearChat();
        }}
        onCancel={() => setShowClearDialog(false)}
      />

      {/* Navigation drawer */}
      <NavigationDrawer visible={drawerVisible} onClose={handleCloseDrawer} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  menuWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  headerWrap: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingBottom: 12,
    position: 'relative',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  clearButton: {
    position: 'absolute',
    right: 14,
    padding: 8,
    borderRadius: 999,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  messageContainer: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.buttonBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  userAvatar: {
    backgroundColor: Colors.accentPrimary + '20',
    borderColor: Colors.accentPrimary + '40',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: Colors.accentPrimary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.buttonBackground,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  assistantMessageText: {
    color: Colors.textPrimary,
  },
  formattedTextContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accentPrimary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  sampleQuestionsContainer: {
    width: '100%',
    maxWidth: 400,
  },
  sampleQuestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  sampleQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  sampleQuestionChip: {
    backgroundColor: Colors.buttonBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    maxWidth: '100%',
  },
  sampleQuestionText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickQuestionsContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  quickQuestionsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingRight: 16,
  },
  quickQuestionChip: {
    backgroundColor: Colors.buttonBackground,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickQuestionText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingVertical: 8,
    paddingRight: 4,
    maxHeight: 52,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.buttonBackground,
    shadowOpacity: 0,
    elevation: 0,
  },
  typingBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
