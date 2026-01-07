import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Container,
} from "@mui/material";
import {
  EmojiEvents,
  TrendingUp,
  CheckCircle,
  Star,
  Autorenew,
} from "@mui/icons-material";
import { useApp } from "../../context/AppContext";
import calmPalette from "../../theme/calmPalette";

const WelcomePage = ({ onNewMessage }) => {
  const { user } = useApp();
  
  // Motivational quotes for the wheel
  const motivationalQuotes = [
    { text: "كل يوم فرصة جديدة للنجاح! 🌟", color: "#1976d2" },
    { text: "أنت قادر على تحقيق المستحيل! 💪", color: "#2e7d32" },
    { text: "التفاصيل الصغيرة تصنع الفرق الكبير! ✨", color: "#ed6c02" },
    { text: "استمر في التقدم، أنت على الطريق الصحيح! 🚀", color: "#9c27b0" },
    { text: "عملك مهم ومساهمتك قيمة! 🌟", color: "#d32f2f" },
    { text: "كل جهد تقوم به يساهم في النجاح! 💎", color: "#0288d1" },
    { text: "أنت جزء من فريق رائع! 👏", color: "#388e3c" },
    { text: "اليوم هو بداية جديدة! 🌅", color: "#f57c00" },
    { text: "الإصرار هو مفتاح النجاح! 🔑", color: "#7b1fa2" },
    { text: "أنت تقوم بعمل رائع! 🎯", color: "#c2185b" },
  ];
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(motivationalQuotes[0]);
  const [rotation, setRotation] = useState(0);
  const [displayedText, setDisplayedText] = useState(motivationalQuotes[0].text);
  const [isTyping, setIsTyping] = useState(false);

  // Audio functions - More exciting sounds!
  const playSpinSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a more exciting "whoosh" sound with multiple oscillators
      const baseTime = audioContext.currentTime;
      
      // Low whoosh
      const lowOsc = audioContext.createOscillator();
      const lowGain = audioContext.createGain();
      lowOsc.connect(lowGain);
      lowGain.connect(audioContext.destination);
      
      lowOsc.frequency.setValueAtTime(150, baseTime);
      lowOsc.frequency.exponentialRampToValueAtTime(80, baseTime + 0.2);
      lowOsc.type = 'sawtooth';
      
      lowGain.gain.setValueAtTime(0, baseTime);
      lowGain.gain.linearRampToValueAtTime(0.4, baseTime + 0.05);
      lowGain.gain.exponentialRampToValueAtTime(0.01, baseTime + 0.2);
      
      lowOsc.start(baseTime);
      lowOsc.stop(baseTime + 0.2);
      
      // High sparkle
      const highOsc = audioContext.createOscillator();
      const highGain = audioContext.createGain();
      highOsc.connect(highGain);
      highGain.connect(audioContext.destination);
      
      highOsc.frequency.setValueAtTime(800, baseTime);
      highOsc.frequency.exponentialRampToValueAtTime(1200, baseTime + 0.15);
      highOsc.type = 'square';
      
      highGain.gain.setValueAtTime(0, baseTime);
      highGain.gain.linearRampToValueAtTime(0.25, baseTime + 0.03);
      highGain.gain.exponentialRampToValueAtTime(0.01, baseTime + 0.15);
      
      highOsc.start(baseTime);
      highOsc.stop(baseTime + 0.15);
    } catch (error) {
    }
  };

  const playWheelSpinningSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      let currentTime = audioContext.currentTime;
      
      // More dynamic spinning sound with varying frequencies and types
      for (let i = 0; i < 12; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Vary frequency more dramatically
        const baseFreq = 250 + (i * 30);
        oscillator.frequency.setValueAtTime(baseFreq, currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, currentTime + 0.1);
        
        // Alternate between wave types for more excitement
        oscillator.type = i % 2 === 0 ? 'sine' : 'triangle';
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.03);
        gainNode.gain.linearRampToValueAtTime(0.15, currentTime + 0.07);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.12);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.12);
        
        currentTime += 0.25; // Faster beeps for more excitement
      }
    } catch (error) {
    }
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const baseTime = audioContext.currentTime;
      
      // More exciting victory fanfare - Major chord progression
      const chord = [
        { freq: 523.25, time: 0 },    // C
        { freq: 659.25, time: 0.05 }, // E
        { freq: 783.99, time: 0.1 },  // G
        { freq: 1046.50, time: 0.15 }, // C (octave)
      ];
      
      chord.forEach((note, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = note.freq;
        oscillator.type = 'sine';
        
        const startTime = baseTime + note.time;
        const duration = 0.4 - (index * 0.05); // Longer notes for lower frequencies
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + duration * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
      
      // Add a final "ding" for extra excitement
      setTimeout(() => {
        try {
          const dingOsc = audioContext.createOscillator();
          const dingGain = audioContext.createGain();
          
          dingOsc.connect(dingGain);
          dingGain.connect(audioContext.destination);
          
          dingOsc.frequency.setValueAtTime(1000, baseTime + 0.5);
          dingOsc.frequency.exponentialRampToValueAtTime(1500, baseTime + 0.6);
          dingOsc.type = 'sine';
          
          dingGain.gain.setValueAtTime(0, baseTime + 0.5);
          dingGain.gain.linearRampToValueAtTime(0.35, baseTime + 0.52);
          dingGain.gain.exponentialRampToValueAtTime(0.01, baseTime + 0.6);
          
          dingOsc.start(baseTime + 0.5);
          dingOsc.stop(baseTime + 0.6);
        } catch (error) {
          // Ignore if context is closed
        }
      }, 500);
    } catch (error) {
    }
  };


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  };

  const spinWheel = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setIsTyping(false);
    setDisplayedText(""); // Clear text before spinning
    
    // Play spin start sound
    playSpinSound();
    
    // Play spinning sound after a short delay
    setTimeout(() => {
      playWheelSpinningSound();
    }, 100);
    
    // Random rotation (multiple full rotations + random angle)
    const spins = 5; // Number of full rotations
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    const anglePerSegment = 360 / motivationalQuotes.length;
    const targetAngle = randomIndex * anglePerSegment;
    const totalRotation = rotation + spins * 360 + (360 - targetAngle);
    
    setRotation(totalRotation);
    
    // Update selected quote after animation
    setTimeout(() => {
      const newQuote = motivationalQuotes[randomIndex];
      setSelectedQuote(newQuote);
      setIsSpinning(false);
      
      // Play success sound when quote is selected
      playSuccessSound();
      
      // Start typewriter effect
      setIsTyping(true);
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex < newQuote.text.length) {
          setDisplayedText(newQuote.text.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 50); // Speed of typing (50ms per character)
    }, 3000); // Match animation duration
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, rgba(94, 78, 62, 0.1) 0%, rgba(75, 61, 49, 0.05) 100%)",
          borderRadius: 4,
          p: 2.5,
          mb: 4,
          border: "1px solid rgba(94, 78, 62, 0.15)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            right: 0,
            width: "200px",
            height: "200px",
            background: "radial-gradient(circle, rgba(94, 78, 62, 0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, position: "relative", zIndex: 1 }}>
          <Avatar
            sx={{
              width: 70,
              height: 70,
              bgcolor: calmPalette.primary,
              fontSize: "1.8rem",
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(94, 78, 62, 0.2)",
            }}
          >
            {user?.name?.charAt(0) || "م"}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: calmPalette.textPrimary,
                mb: 0.5,
                background: "linear-gradient(135deg, #5E4E3E 0%, #4B3D31 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {getGreeting()}، {user?.name || "موظفنا العزيز"} 👋
            </Typography>
            <Typography variant="body1" sx={{ color: calmPalette.textSecondary, fontWeight: 500 }}>
              نتمنى لك يوم عمل مثمر ومليء بالإنجازات! 🌟
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Motivational Wheel */}
            <Box
              sx={{
                position: "relative",
                width: 200,
                height: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Outer Glow Ring */}
              <Box
                sx={{
                  position: "absolute",
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background: `conic-gradient(
                    ${motivationalQuotes.map((q, i) => 
                      `${q.color} ${(i * 360) / motivationalQuotes.length}deg ${((i + 1) * 360) / motivationalQuotes.length}deg`
                    ).join(', ')}
                  )`,
                  filter: "blur(8px)",
                  opacity: 0.6,
                  animation: isSpinning ? "glowPulse 1s ease-in-out infinite" : "none",
                  "@keyframes glowPulse": {
                    "0%, 100%": { opacity: 0.6, transform: "scale(1)" },
                    "50%": { opacity: 0.9, transform: "scale(1.05)" },
                  },
                }}
              />
              
              {/* Main Wheel */}
              <Box
                onClick={spinWheel}
                sx={{
                  width: 170,
                  height: 170,
                  borderRadius: "50%",
                  background: `conic-gradient(
                    ${motivationalQuotes.map((q, i) => 
                      `${q.color} ${(i * 360) / motivationalQuotes.length}deg ${((i + 1) * 360) / motivationalQuotes.length}deg`
                    ).join(', ')}
                  )`,
                  border: "10px solid rgba(255, 255, 255, 0.95)",
                  boxShadow: `
                    0 0 0 4px rgba(94, 78, 62, 0.1),
                    0 12px 48px rgba(94, 78, 62, 0.4),
                    inset 0 0 40px rgba(255, 255, 255, 0.3)
                  `,
                  cursor: isSpinning ? "not-allowed" : "pointer",
                  transition: isSpinning 
                    ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" 
                    : "all 0.3s ease",
                  transform: `rotate(${rotation}deg)`,
                  position: "relative",
                  zIndex: 2,
                  "&:hover": !isSpinning && {
                    transform: `rotate(${rotation}deg) scale(1.08)`,
                    boxShadow: `
                      0 0 0 6px rgba(94, 78, 62, 0.15),
                      0 16px 64px rgba(94, 78, 62, 0.5),
                      inset 0 0 50px rgba(255, 255, 255, 0.4)
                    `,
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.9) 100%)",
                    border: "5px solid rgba(94, 78, 62, 0.2)",
                    boxShadow: "inset 0 2px 8px rgba(94, 78, 62, 0.1), 0 4px 12px rgba(94, 78, 62, 0.2)",
                    zIndex: 2,
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "45px",
                    height: "45px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${selectedQuote.color}20 0%, transparent 70%)`,
                    zIndex: 1,
                    animation: isSpinning ? "centerPulse 0.8s ease-in-out infinite" : "none",
                    "@keyframes centerPulse": {
                      "0%, 100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 0.5 },
                      "50%": { transform: "translate(-50%, -50%) scale(1.3)", opacity: 0.8 },
                    },
                  },
                }}
              >
                {/* Segment Dividers */}
                {motivationalQuotes.map((_, i) => {
                  const angle = (i * 360) / motivationalQuotes.length;
                  return (
                    <Box
                      key={i}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        width: "2px",
                        height: "85px",
                        background: "rgba(255, 255, 255, 0.6)",
                        transformOrigin: "0 0",
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-85px)`,
                        zIndex: 1,
                      }}
                    />
                  );
                })}
              </Box>
              
              {/* Pointer Arrow */}
              <Box
                sx={{
                  position: "absolute",
                  top: -15,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "16px solid transparent",
                  borderRight: "16px solid transparent",
                  borderTop: "28px solid #5E4E3E",
                  zIndex: 5,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: -32,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "12px solid transparent",
                    borderRight: "12px solid transparent",
                    borderTop: "20px solid rgba(94, 78, 62, 0.3)",
                  },
                }}
              />
              
              {/* Center Button */}
              <Box
                onClick={spinWheel}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 4,
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.9) 100%)",
                  border: "4px solid rgba(94, 78, 62, 0.2)",
                  boxShadow: "inset 0 2px 8px rgba(94, 78, 62, 0.1), 0 4px 16px rgba(94, 78, 62, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isSpinning ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  "&:hover": !isSpinning && {
                    transform: "translate(-50%, -50%) scale(1.1)",
                    boxShadow: "inset 0 2px 8px rgba(94, 78, 62, 0.15), 0 6px 20px rgba(94, 78, 62, 0.4)",
                    borderColor: calmPalette.primary,
                  },
                  "&:active": !isSpinning && {
                    transform: "translate(-50%, -50%) scale(0.95)",
                  },
                }}
              >
                <Autorenew 
                  sx={{ 
                    fontSize: 30, 
                    color: calmPalette.primary,
                    animation: isSpinning ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }} 
                />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: "0.55rem",
                    fontWeight: 800,
                    color: calmPalette.textPrimary,
                    textAlign: "center",
                    mt: 0.3,
                    letterSpacing: "0.5px",
                  }}
                >
                  اضغط
                </Typography>
              </Box>
            </Box>
            
            {/* Selected Quote Display */}
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${selectedQuote.color}20 0%, ${selectedQuote.color}10 100%)`,
                backdropFilter: "blur(15px)",
                border: `2px solid ${selectedQuote.color}50`,
                textAlign: "center",
                minWidth: 280,
                maxWidth: 320,
                transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: `
                  0 8px 32px ${selectedQuote.color}30,
                  inset 0 1px 0 rgba(255, 255, 255, 0.5)
                `,
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: `linear-gradient(90deg, ${selectedQuote.color} 0%, ${selectedQuote.color}80 100%)`,
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: "-50%",
                  right: "-50%",
                  width: "200%",
                  height: "200%",
                  background: `radial-gradient(circle, ${selectedQuote.color}10 0%, transparent 70%)`,
                  animation: "quoteGlow 3s ease-in-out infinite",
                  "@keyframes quoteGlow": {
                    "0%, 100%": { transform: "scale(1)", opacity: 0.5 },
                    "50%": { transform: "scale(1.1)", opacity: 0.8 },
                  },
                },
              }}
            >
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    p: 1,
                    borderRadius: "50%",
                    bgcolor: `${selectedQuote.color}20`,
                    mb: 1,
                    animation: "iconBounce 2s ease-in-out infinite",
                    "@keyframes iconBounce": {
                      "0%, 100%": { transform: "translateY(0)" },
                      "50%": { transform: "translateY(-5px)" },
                    },
                  }}
                >
                  <EmojiEvents sx={{ fontSize: 26, color: selectedQuote.color }} />
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 800, 
                    color: calmPalette.textPrimary,
                    mb: 0.5,
                    background: `linear-gradient(135deg, ${selectedQuote.color} 0%, ${selectedQuote.color}80 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                 حكمة اليوم
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: calmPalette.textPrimary,
                    fontWeight: 600,
                    lineHeight: 1.6,
                    fontSize: "0.95rem",
                    minHeight: "2.8em",
                    position: "relative",
                  }}
                >
                  {displayedText}
                  {isTyping && (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-block",
                        width: "3px",
                        height: "1.2em",
                        bgcolor: selectedQuote.color,
                        ml: 0.5,
                        verticalAlign: "text-bottom",
                        animation: "blink 1s infinite",
                        "@keyframes blink": {
                          "0%, 50%": { opacity: 1 },
                          "51%, 100%": { opacity: 0 },
                        },
                      }}
                    />
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Motivational Cards */}
      <Grid container spacing={3} sx={{ mb: 4, display: "flex", flexWrap: "nowrap" }}>
        <Grid item xs={4} sm={4} md={4} sx={{ flex: "1 1 0", minWidth: 0 }}>
          <Card
            elevation={0}
            sx={{
              background: "linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)",
              borderRadius: 3,
              border: "1px solid rgba(25, 118, 210, 0.2)",
              p: 2,
              height: "100%",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 8px 24px rgba(25, 118, 210, 0.15)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: "rgba(25, 118, 210, 0.2)", width: 48, height: 48 }}>
                <TrendingUp sx={{ color: "#1976d2" }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                  التقدم المستمر
                </Typography>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                  كل يوم فرصة جديدة
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: calmPalette.textPrimary, lineHeight: 1.8 }}>
              استمر في العمل بجد واجتهاد، كل جهد تقوم به يساهم في نجاح الفريق! 💪
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={4} sm={4} md={4} sx={{ flex: "1 1 0", minWidth: 0 }}>
          <Card
            elevation={0}
            sx={{
              background: "linear-gradient(135deg, rgba(46, 125, 50, 0.1) 0%, rgba(46, 125, 50, 0.05) 100%)",
              borderRadius: 3,
              border: "1px solid rgba(46, 125, 50, 0.2)",
              p: 3,
              height: "100%",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 8px 24px rgba(46, 125, 50, 0.15)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: "rgba(46, 125, 50, 0.2)", width: 48, height: 48 }}>
                <CheckCircle sx={{ color: "#2e7d32" }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                  الجودة أولاً
                </Typography>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                  التفاصيل تصنع الفرق
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: calmPalette.textPrimary, lineHeight: 1.8 }}>
              انتبه للتفاصيل الصغيرة، فهي التي تميز عملك وتجعله متميزاً! ✨
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={4} sm={4} md={4} sx={{ flex: "1 1 0", minWidth: 0 }}>
          <Card
            elevation={0}
            sx={{
              background: "linear-gradient(135deg, rgba(237, 108, 2, 0.1) 0%, rgba(237, 108, 2, 0.05) 100%)",
              borderRadius: 3,
              border: "1px solid rgba(237, 108, 2, 0.2)",
              p: 3,
              height: "100%",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 8px 24px rgba(237, 108, 2, 0.15)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Avatar sx={{ bgcolor: "rgba(237, 108, 2, 0.2)", width: 48, height: 48 }}>
                <Star sx={{ color: "#ed6c02" }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
                  التميز
                </Typography>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
                  أنت جزء من فريق رائع
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: calmPalette.textPrimary, lineHeight: 1.8 }}>
              عملك مهم ومساهمتك قيمة، نحن فخورون بك! 🌟
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default WelcomePage;

