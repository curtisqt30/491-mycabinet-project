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
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme as Colors } from '@/components/ui/ColorPalette';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import MenuButton from '@/components/ui/MenuButton';
import NavigationDrawer from '@/components/ui/NavigationDrawer';

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

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
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

  // Generate mock assistant response based on user input
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

  const handleSend = () => {
    if (inputText.trim() === '' || isLoading) return;

    const userMessage = inputText.trim();
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

    // Simulate assistant thinking time (1-2 seconds)
    setTimeout(
      () => {
        const assistantResponse: Message = {
          id: `${Date.now() + 1}`,
          text: generateMockResponse(userMessage),
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantResponse]);
        setIsLoading(false);
        scrollToBottom(flatListRef);
      },
      1000 + Math.random() * 1000,
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
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
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={Colors.textSecondary}
                />
                <Text style={styles.emptyText}>
                  Start a conversation with your cocktail assistant
                </Text>
              </View>
            )
          }
          ListFooterComponent={renderTypingIndicator}
        />

        {/* Input area */}
        <View
          style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (inputText.trim() === '' || isLoading) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
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
    marginVertical: 6,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: Colors.accentPrimary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.buttonBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    alignItems: 'flex-end',
    backgroundColor: Colors.inputBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    maxHeight: 104,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.buttonBackground,
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
