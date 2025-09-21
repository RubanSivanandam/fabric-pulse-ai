import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Float, Environment, Html } from '@react-three/drei';
import { gsap } from 'gsap';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  BarChart3, 
  FileText, 
  TrendingUp,
  Download,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 3D Robot Model Component (Fallback when GLB not available)
const Robot3D = React.memo(() => {
  const meshRef = useRef(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.15;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    }
  });

  return (
    <group>
      {/* Robot Body */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.2, 0.6]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.7} roughness={0.3} />
      </mesh>
      
      {/* Robot Head */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#1d4ed8" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.15, 0.85, 0.35]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.15, 0.85, 0.35]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-0.5, 0.2, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8]} />
        <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.5, 0.2, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8]} />
        <meshStandardMaterial color="#2563eb" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
});

// Enhanced 3D Bot with GLB fallback
const EnhancedRobot3D = () => {
  const [useGLB, setUseGLB] = useState(true);
  
  // Try to load GLB model, fallback to basic robot
  const RobotModel = () => {
    try {
      if (useGLB) {
        const { scene } = useGLTF('/models/winged+robot+3d+model.glb');
        const meshRef = useRef(null);
        
        useFrame((state) => {
          if (meshRef.current) {
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.1;
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
          }
        });
        
        return (
          <primitive 
            ref={meshRef}
            object={scene} 
            scale={[0.8, 0.8, 0.8]} 
            position={[0, -0.5, 0]} 
          />
        );
      }
    } catch (error) {
      console.warn('GLB model failed to load, using fallback robot');
      setUseGLB(false);
    }
    
    return <Robot3D />;
  };
  
  return <RobotModel />;
};

// Floating 3D Bot Icon Component
const FloatingBot3D = ({ isVisible, onClick, isHovered, onHover }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (containerRef.current && isVisible) {
      // GSAP floating animation
      gsap.to(containerRef.current, {
        y: "+=10",
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut"
      });
      
      // Subtle rotation
      gsap.to(containerRef.current, {
        rotation: "+=5",
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
      });
    }
  }, [isVisible]);
  
  // Handle hover effects
  useEffect(() => {
    if (containerRef.current) {
      if (isHovered) {
        gsap.to(containerRef.current, {
          scale: 1.1,
          duration: 0.3,
          ease: "back.out(1.7)"
        });
      } else {
        gsap.to(containerRef.current, {
          scale: 1,
          duration: 0.3,
          ease: "back.out(1.7)"
        });
      }
    }
  }, [isHovered]);
  
  const handleClick = () => {
    // Pop animation before opening modal
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1.3,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
        onComplete: onClick
      });
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            ref={containerRef}
            className="fixed bottom-6 right-6 w-20 h-20 z-50 cursor-pointer"
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
            onClick={handleClick}
            whileHover={{ filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.6))" }}
          >
            <Canvas>
              <Suspense fallback={
                <Html>
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-8 h-8 text-primary-foreground" />
                  </div>
                </Html>
              }>
                <ambientLight intensity={0.6} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                <pointLight position={[-10, -10, -10]} />
                <Float
                  speed={2}
                  rotationIntensity={0.5}
                  floatIntensity={0.5}
                  floatingRange={[0, 0.2]}
                >
                  <EnhancedRobot3D />
                </Float>
                <Environment preset="city" />
              </Suspense>
            </Canvas>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-semibold">RTMS AI BOT</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Typing Animation Component
const TypingAnimation = () => (
  <div className="flex space-x-1 p-3">
    <motion.div
      className="w-2 h-2 bg-primary rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
    />
    <motion.div
      className="w-2 h-2 bg-primary rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
    />
    <motion.div
      className="w-2 h-2 bg-primary rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
    />
  </div>
);

// Streaming Text Component
const StreamingText = ({ text, onComplete, speed = 30 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (text && !isComplete) {
      let i = 0;
      const timer = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(timer);
          onComplete?.();
        }
      }, speed);
      
      return () => clearInterval(timer);
    }
  }, [text, isComplete, onComplete, speed]);
  
  return (
    <div className="whitespace-pre-wrap">
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({ message, onDownload }) => {
  const isUser = message.type === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "back.out(1.7)" }}
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg",
        isUser 
          ? "bg-primary text-primary-foreground ml-12" 
          : "bg-card border border-border mr-12"
      )}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">RTMS AI</span>
          </div>
        )}
        
        <div className="text-sm leading-relaxed">
          {message.isStreaming ? (
            <StreamingText text={message.content} speed={25} />
          ) : (
            message.content
          )}
        </div>
        
        {message.exportFile && onDownload && (
          <motion.div 
            className="mt-3 pt-3 border-t border-border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(message.exportFile)}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </motion.div>
        )}
        
        {message.error && (
          <div className="flex items-center gap-2 mt-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <Button
              size="sm"
              variant="ghost"
              className="p-0 h-auto text-destructive hover:text-destructive"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        )}
        
        <div className="mt-2 text-xs opacity-60">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
};

// Suggestion Chips Component
const SuggestionChips = ({ suggestions, onSelect, className }) => {
  return (
    <motion.div 
      className={cn("flex flex-wrap gap-2", className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {suggestions.map((suggestion) => (
        <motion.div
          key={suggestion.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 text-xs hover:bg-primary/10 border-primary/20"
            onClick={() => onSelect(suggestion)}
            whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.2)" }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="mr-2">{suggestion.icon}</span>
            {suggestion.text}
          </Button>
        </motion.div>
      ))}
    </motion.div>
  );
};

// Main RTMS Bot Component
const RTMSBot = () => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('summarize');
  const [isHovered, setIsHovered] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const modalRef = useRef(null);
  
  // Suggestion chips data
  const suggestions = useMemo(() => [
    {
      id: '1',
      text: 'Summarize efficiency for last 2 months',
      action: 'summarize_efficiency_2months',
      icon: <BarChart3 className="w-3 h-3" />
    },
    {
      id: '2', 
      text: 'Suggest corrective actions for low performing lines',
      action: 'suggest_corrective_actions',
      icon: <TrendingUp className="w-3 h-3" />
    },
    {
      id: '3',
      text: 'Download production efficiency report as PDF',
      action: 'download_efficiency_pdf',
      icon: <FileText className="w-3 h-3" />
    },
    {
      id: '4',
      text: 'Download flagged employees as CSV',
      action: 'download_flagged_csv', 
      icon: <Download className="w-3 h-3" />
    }
  ], []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'end' 
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Modal animations
  useEffect(() => {
    if (modalRef.current) {
      if (isOpen) {
        gsap.fromTo(modalRef.current, 
          { 
            opacity: 0, 
            scale: 0.8,
            y: 50 
          },
          { 
            opacity: 1, 
            scale: 1,
            y: 0,
            duration: 0.4,
            ease: "back.out(1.7)" 
          }
        );
      }
    }
  }, [isOpen]);

  // API Integration Functions
  const callAIAPI = async (query, endpoint = '/api/ai/ultra_chatbot') => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, tab: currentTab }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  // Streaming API call
  const callStreamingAPI = async (query) => {
    const response = await fetch('/api/ai/ultra_chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, tab: currentTab, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Streaming API call failed');
    }

    return response.body;
  };

  // Handle streaming response
  const processStreamingResponse = async (stream, messageId) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        // Update message with accumulated text
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: fullText, isStreaming: true }
            : msg
        ));
      }
      
      // Mark streaming as complete
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));
      
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: '⚠️ Sorry, something went wrong.', error: true, isStreaming: false }
          : msg
      ));
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  // Send message function
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    const messageId = Date.now().toString();
    const userMessage = {
      id: messageId + '_user',
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const botMessage = {
      id: messageId + '_bot',
      type: 'bot', 
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Try streaming first
      try {
        const stream = await callStreamingAPI(content);
        await processStreamingResponse(stream, messageId + '_bot');
        return;
      } catch (streamError) {
        console.warn('Streaming failed, falling back to regular API:', streamError);
      }

      // Fallback to regular API call
      const response = await callAIAPI(content);
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId + '_bot'
          ? { 
              ...msg, 
              content: response.answer, 
              isStreaming: false,
              exportFile: response.export_file 
            }
          : msg
      ));

    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId + '_bot'
          ? { 
              ...msg, 
              content: '⚠️ Sorry, something went wrong.', 
              error: true,
              isStreaming: false 
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [isLoading, currentTab]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion) => {
    setInputValue(suggestion.text);
    sendMessage(suggestion.text);
  }, [sendMessage]);

  // Handle download
  const handleDownload = useCallback(async (filename) => {
    try {
      const response = await fetch(`/api/downloads/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, []);

  // Handle input submission
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  // Handle close with animation
  const handleClose = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0,
        scale: 0.8,
        y: 50,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => setIsOpen(false)
      });
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating 3D Bot Icon */}
      <FloatingBot3D
        isVisible={!isOpen}
        onClick={() => setIsOpen(true)}
        isHovered={isHovered}
        onHover={setIsHovered}
      />

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <Card 
              ref={modalRef}
              className="w-full max-w-2xl h-[80vh] max-h-[600px] shadow-2xl border-primary/20"
            >
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="relative">
                      <Bot className="w-6 h-6 text-primary" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    </div>
                    RTMS AI BOT
                  </CardTitle>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onMouseEnter={(e) => {
                      gsap.to(e.currentTarget, { 
                        rotation: 90, 
                        duration: 0.2 
                      });
                    }}
                    onMouseLeave={(e) => {
                      gsap.to(e.currentTarget, { 
                        rotation: 0, 
                        duration: 0.2 
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2 mt-4">
                  {['summarize', 'suggest', 'predict'].map((tab) => (
                    <Button
                      key={tab}
                      variant={currentTab === tab ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentTab(tab)}
                      className="capitalize"
                    >
                      {tab}
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col p-0 h-full">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8 text-muted-foreground"
                      >
                        <Bot className="w-12 h-12 mx-auto mb-4 text-primary" />
                        <h3 className="text-lg font-semibold mb-2">Welcome to RTMS AI Assistant</h3>
                        <p className="text-sm">Ask me anything about production efficiency, analytics, or reports!</p>
                      </motion.div>
                    )}
                    
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        onDownload={handleDownload}
                      />
                    ))}
                    
                    {isLoading && !isStreaming && (
                      <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl mr-12">
                          <TypingAnimation />
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card/50">
                  {/* Suggestion Chips */}
                  {messages.length === 0 && (
                    <SuggestionChips
                      suggestions={suggestions}
                      onSelect={handleSuggestionSelect}
                      className="mb-4"
                    />
                  )}
                  
                  {/* Input Form */}
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Ask me to ${currentTab}...`}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button 
                      type="submit" 
                      size="sm"
                      disabled={!inputValue.trim() || isLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RTMSBot;