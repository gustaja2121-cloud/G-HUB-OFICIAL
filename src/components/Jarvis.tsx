import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Settings, 
  Bot, 
  Loader2, 
  Sparkles, 
  Trash2, 
  X,
  ArrowDownCircle,
  HelpCircle
} from 'lucide-react';
import * as THREE from 'three';
import { storage } from '../lib/storage';
import { sendToJarvas, getGeminiApiKey, saveGeminiApiKey } from '../lib/gemini';
import { JarvisChatMessage, JarvisFact } from '../types';
import { motion, AnimatePresence } from 'motion/react';

type JarvisState = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function Jarvis() {
  const [messages, setMessages] = useState<JarvisChatMessage[]>([]);
  const [facts, setFacts] = useState<JarvisFact[]>([]);
  const [inputText, setInputText] = useState('');
  const [state, setState] = useState<JarvisState>('idle');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  
  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const [isVoiceFullscreen, setIsVoiceFullscreen] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const stateRef = useRef<JarvisState>('idle');

  // Keep stateRef in sync to access in WebGL loop
  useEffect(() => {
    stateRef.current = state;
    // Auto-exit fullscreen when conversation is done
    if (state === 'idle') {
      // Give a small delay so user sees the atom go back to idle before closing
      const t = setTimeout(() => setIsVoiceFullscreen(false), 1200);
      return () => clearTimeout(t);
    }
  }, [state]);

  // 3D Three.js Instance Creator
  const initThreeInstance = (canvas: HTMLCanvasElement) => {
    const width = canvas.clientWidth || canvas.offsetWidth || 300;
    const height = canvas.clientHeight || canvas.offsetHeight || 300;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 4.2;

    // ---- CORE sphere: 1200 points ----
    const CORE_COUNT = 1200;
    const corePositions = new Float32Array(CORE_COUNT * 3);
    const corePhases = new Float32Array(CORE_COUNT);
    const coreR = new Float32Array(CORE_COUNT);
    for (let i = 0; i < CORE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.38 + Math.random() * 0.14;
      coreR[i] = r;
      corePositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      corePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      corePositions[i * 3 + 2] = r * Math.cos(phi);
      corePhases[i] = Math.random() * Math.PI * 2;
    }
    const coreGeom = new THREE.BufferGeometry();
    const corePosAttr = new THREE.BufferAttribute(corePositions, 3);
    corePosAttr.setUsage(THREE.DynamicDrawUsage);
    coreGeom.setAttribute('position', corePosAttr);
    const coreMat = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.025,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const corePoints = new THREE.Points(coreGeom, coreMat);
    scene.add(corePoints);

    // ---- RING 1 – horizontal orbit: 600 points ----
    const R1_COUNT = 600;
    const ring1Phases = new Float32Array(R1_COUNT);
    const ring1R = new Float32Array(R1_COUNT);
    const ring1Pos = new Float32Array(R1_COUNT * 3);
    for (let i = 0; i < R1_COUNT; i++) {
      ring1Phases[i] = (i / R1_COUNT) * Math.PI * 2 + Math.random() * 0.08;
      ring1R[i] = 1.22 + Math.random() * 0.06;
      ring1Pos[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
    }
    const ring1Geom = new THREE.BufferGeometry();
    const ring1PosAttr = new THREE.BufferAttribute(ring1Pos, 3);
    ring1PosAttr.setUsage(THREE.DynamicDrawUsage);
    ring1Geom.setAttribute('position', ring1PosAttr);
    const ring1Mat = new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.018, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring1Points = new THREE.Points(ring1Geom, ring1Mat);
    scene.add(ring1Points);

    // ---- RING 2 – vertical orbit: 500 points ----
    const R2_COUNT = 500;
    const ring2Phases = new Float32Array(R2_COUNT);
    const ring2R = new Float32Array(R2_COUNT);
    const ring2Pos = new Float32Array(R2_COUNT * 3);
    for (let i = 0; i < R2_COUNT; i++) {
      ring2Phases[i] = (i / R2_COUNT) * Math.PI * 2 + Math.random() * 0.08;
      ring2R[i] = 1.35 + Math.random() * 0.06;
      ring2Pos[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    const ring2Geom = new THREE.BufferGeometry();
    const ring2PosAttr = new THREE.BufferAttribute(ring2Pos, 3);
    ring2PosAttr.setUsage(THREE.DynamicDrawUsage);
    ring2Geom.setAttribute('position', ring2PosAttr);
    const ring2Mat = new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.016, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring2Points = new THREE.Points(ring2Geom, ring2Mat);
    scene.add(ring2Points);

    // ---- RING 3 – diagonal orbit: 400 points ----
    const R3_COUNT = 400;
    const ring3Phases = new Float32Array(R3_COUNT);
    const ring3R = new Float32Array(R3_COUNT);
    const ring3Pos = new Float32Array(R3_COUNT * 3);
    for (let i = 0; i < R3_COUNT; i++) {
      ring3Phases[i] = (i / R3_COUNT) * Math.PI * 2 + Math.random() * 0.08;
      ring3R[i] = 1.48 + Math.random() * 0.06;
    }
    const ring3Geom = new THREE.BufferGeometry();
    const ring3PosAttr = new THREE.BufferAttribute(ring3Pos, 3);
    ring3PosAttr.setUsage(THREE.DynamicDrawUsage);
    ring3Geom.setAttribute('position', ring3PosAttr);
    const ring3Mat = new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.014, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring3Points = new THREE.Points(ring3Geom, ring3Mat);
    scene.add(ring3Points);

    // ---- DUST – ambient floating particles: 800 points ----
    const DUST_COUNT = 800;
    const dustPos = new Float32Array(DUST_COUNT * 3);
    const dustPhases = new Float32Array(DUST_COUNT);
    const dustBasePos = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.6 + Math.random() * 1.1;
      dustBasePos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      dustBasePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      dustBasePos[i * 3 + 2] = r * Math.cos(phi);
      dustPhases[i] = Math.random() * Math.PI * 2;
    }
    const dustGeom = new THREE.BufferGeometry();
    const dustPosAttr = new THREE.BufferAttribute(dustPos, 3);
    dustPosAttr.setUsage(THREE.DynamicDrawUsage);
    dustGeom.setAttribute('position', dustPosAttr);
    const dustMat = new THREE.PointsMaterial({ color: 0x0099cc, size: 0.012, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    const dustPoints = new THREE.Points(dustGeom, dustMat);
    scene.add(dustPoints);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const currentState = stateRef.current;

      // State-based config
      let coreColor: number, ringColor: number, ringSpeed: number, coreOpacity: number;
      if (currentState === 'listening') {
        coreColor = 0x00ffaa; ringColor = 0x00ffaa; ringSpeed = 2.2; coreOpacity = 1.0;
      } else if (currentState === 'thinking') {
        coreColor = 0xffcc00; ringColor = 0xffcc00; ringSpeed = 3.5; coreOpacity = 0.95;
      } else if (currentState === 'speaking') {
        coreColor = 0xff3355; ringColor = 0xff3355; ringSpeed = 2.5; coreOpacity = 1.0;
      } else {
        coreColor = 0x00d4ff; ringColor = 0x00d4ff; ringSpeed = 1.0; coreOpacity = 0.9;
      }

      coreMat.color.setHex(coreColor);
      ring1Mat.color.setHex(ringColor);
      ring2Mat.color.setHex(ringColor);
      ring3Mat.color.setHex(ringColor);

      // Animate core – pulse effect
      const cp = corePosAttr.array as Float32Array;
      for (let i = 0; i < CORE_COUNT; i++) {
        const phase = corePhases[i];
        let pulse = 1.0 + Math.sin(time * 2.5 + phase) * 0.06;
        if (currentState === 'speaking') pulse += Math.sin(time * 14 + phase) * 0.18;
        if (currentState === 'listening') pulse += Math.sin(time * 7 + phase) * 0.10;
        const r = coreR[i] * pulse;
        const ox = corePositions[i * 3];
        const oy = corePositions[i * 3 + 1];
        const oz = corePositions[i * 3 + 2];
        const len = Math.sqrt(ox*ox + oy*oy + oz*oz) || 1;
        cp[i * 3]     = (ox / len) * r;
        cp[i * 3 + 1] = (oy / len) * r;
        cp[i * 3 + 2] = (oz / len) * r;
      }
      corePosAttr.needsUpdate = true;

      // Animate Ring 1
      const r1p = ring1PosAttr.array as Float32Array;
      for (let i = 0; i < R1_COUNT; i++) {
        const angle = ring1Phases[i] + time * 0.28 * ringSpeed;
        const r = ring1R[i];
        r1p[i * 3]     = r * Math.cos(angle);
        r1p[i * 3 + 2] = r * Math.sin(angle);
      }
      ring1PosAttr.needsUpdate = true;

      // Animate Ring 2
      const r2p = ring2PosAttr.array as Float32Array;
      for (let i = 0; i < R2_COUNT; i++) {
        const angle = ring2Phases[i] - time * 0.20 * ringSpeed;
        const r = ring2R[i];
        r2p[i * 3]     = r * Math.cos(angle);
        r2p[i * 3 + 1] = r * Math.sin(angle);
      }
      ring2PosAttr.needsUpdate = true;

      // Animate Ring 3
      const r3p = ring3PosAttr.array as Float32Array;
      for (let i = 0; i < R3_COUNT; i++) {
        const angle = ring3Phases[i] + time * 0.16 * ringSpeed;
        const r = ring3R[i];
        r3p[i * 3]     = r * Math.cos(angle);
        r3p[i * 3 + 1] = r * Math.sin(angle) * 0.707;
        r3p[i * 3 + 2] = r * Math.sin(angle) * 0.707;
      }
      ring3PosAttr.needsUpdate = true;

      // Animate dust
      const dp = dustPosAttr.array as Float32Array;
      for (let i = 0; i < DUST_COUNT; i++) {
        const drift = Math.sin(time * 0.4 + dustPhases[i]) * 0.04;
        dp[i * 3]     = dustBasePos[i * 3]     + drift;
        dp[i * 3 + 1] = dustBasePos[i * 3 + 1] + Math.cos(time * 0.3 + dustPhases[i]) * 0.04;
        dp[i * 3 + 2] = dustBasePos[i * 3 + 2] + drift;
      }
      dustPosAttr.needsUpdate = true;

      // Gentle global rotation
      const groupRotY = time * 0.04;
      const groupRotX = Math.sin(time * 0.1) * 0.12;
      [corePoints, ring1Points, ring2Points, ring3Points, dustPoints].forEach(obj => {
        obj.rotation.y = groupRotY;
        obj.rotation.x = groupRotX;
      });

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    const handleResize = () => {
      const w = canvas.clientWidth || canvas.offsetWidth || 300;
      const h = canvas.clientHeight || canvas.offsetHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return {
      cleanup: () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        coreGeom.dispose(); coreMat.dispose();
        ring1Geom.dispose(); ring1Mat.dispose();
        ring2Geom.dispose(); ring2Mat.dispose();
        ring3Geom.dispose(); ring3Mat.dispose();
        dustGeom.dispose(); dustMat.dispose();
        renderer.dispose();
      },
      resize: handleResize,
    };
  };

  // Initialize Home Screen WebGL Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const instance = initThreeInstance(canvasRef.current);
    return () => instance.cleanup();
  }, []);

  // Initialize Fullscreen Voice WebGL Canvas
  useEffect(() => {
    if (!isVoiceFullscreen || !fullscreenCanvasRef.current) return;
    const instance = initThreeInstance(fullscreenCanvasRef.current);
    const t = setTimeout(() => instance.resize(), 100);
    return () => {
      clearTimeout(t);
      instance.cleanup();
    };
  }, [isVoiceFullscreen]);

  // Load API Key, messages, facts and system voices on mount
  useEffect(() => {
    const savedKey = getGeminiApiKey();
    setApiKey(savedKey);

    const savedVoice = localStorage.getItem('jarvas_voice_preference') || '';
    setSelectedVoiceName(savedVoice);

    const loadData = async () => {
      const loadedMessages = await storage.getJarvasMessages();
      const loadedFacts = await storage.getJarvasFacts();
      setMessages(loadedMessages);
      setFacts(loadedFacts);
    };
    loadData();

    // Populate available TTS voices in browser
    const updateVoices = () => {
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        const ptBr = voices.filter(v => 
          v.lang.toLowerCase() === 'pt-br' || 
          v.lang.toLowerCase().replace('_', '-') === 'pt-br' ||
          v.lang.toLowerCase().startsWith('pt')
        );
        setAvailableVoices(ptBr);
      }
    };

    updateVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // Initialize Web Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'pt-BR';

      rec.onstart = () => {
        setIsListening(true);
        setState('listening');
      };

      rec.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          setInputText(transcript);
          handleSendMessage(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setState('idle');
      };

      rec.onend = () => {
        setIsListening(false);
        if (stateRef.current === 'listening') {
          setState('idle');
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  // Text-To-Speech (TTS) voice builder
  const speakText = (text: string) => {
    if (!window.speechSynthesis || !isVoiceEnabled) return;
    
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setState('speaking');

    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    let chosenVoice = voices.find(v => v.name === selectedVoiceName);

    if (!chosenVoice) {
      let ptBrVoices = voices.filter(v => 
        v.lang.toLowerCase() === 'pt-br' || 
        v.lang.toLowerCase().replace('_', '-') === 'pt-br'
      );
      if (ptBrVoices.length === 0) {
        ptBrVoices = voices.filter(v => v.lang.toLowerCase().startsWith('pt'));
      }
      
      // Prioritize fluid natural/online voices over robotic offline voices
      let best = ptBrVoices.find(v => v.name.toLowerCase().includes('natural'));
      if (!best) best = ptBrVoices.find(v => v.name.toLowerCase().includes('google'));
      if (!best) best = ptBrVoices.find(v => !v.localService);
      if (!best) best = ptBrVoices.find(v => v.name.toLowerCase().includes('daniel'));
      if (!best) best = ptBrVoices[0];

      chosenVoice = best;
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    // Keep normal rate and pitch to prevent robotic distortion
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setState('idle');
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setState('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    // Cancel speech synthesis if user speaks/sends text
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setInputText('');
    setLoading(true);
    setState('thinking');

    // Create user message
    const userMsg: JarvisChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    await storage.saveJarvasMessages(updatedMessages);

    try {
      const response = await sendToJarvas(apiKey, updatedMessages, facts);
      
      // Save AI message
      const jarvisMsg: JarvisChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        text: response.reply,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, jarvisMsg];
      setMessages(finalMessages);
      await storage.saveJarvasMessages(finalMessages);

      // Handle extracted facts for memory
      if (response.extractedFact) {
        const newFact: JarvisFact = {
          id: Math.random().toString(36).substring(2, 9),
          userId: 'user', // bound to auth user via storage helpers
          fact: response.extractedFact.fact,
          category: response.extractedFact.category,
          createdAt: new Date().toISOString()
        };

        const updatedFacts = [...facts, newFact];
        setFacts(updatedFacts);
        await storage.saveJarvasFacts(updatedFacts);
      }

      setLoading(false);
      setState('speaking');
      speakText(response.reply);

    } catch (e) {
      console.error(e);
      setLoading(false);
      setState('idle');
      
      const errorMsg: JarvisChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        text: 'Desculpe, Senhor. Ocorreu uma falha ao acessar meu núcleo cognitivo. Por favor, verifique sua chave de API nas configurações.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Desculpe, a entrada de voz não é suportada ou permitida neste navegador.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsVoiceFullscreen(true);
      recognitionRef.current.start();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      saveGeminiApiKey(apiKey.trim());
    }
    localStorage.setItem('jarvas_voice_preference', selectedVoiceName);
    setShowSettings(false);
  };

  const clearChatHistory = async () => {
    if (confirm('Senhor, tem certeza de que deseja apagar os registros da nossa conversa? Isso não apagará as memórias de fatos consolidadas.')) {
      setMessages([]);
      await storage.saveJarvasMessages([]);
    }
  };

  const deleteFact = async (id: string) => {
    const updated = facts.filter(f => f.id !== id);
    setFacts(updated);
    await storage.saveJarvasFacts(updated);
  };

  return (
    <div className="relative flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-12rem)]">

      {/* ── VOICE FULLSCREEN OVERLAY ── */}
      <AnimatePresence>
        {isVoiceFullscreen && (
          <motion.div
            key="voice-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center"
          >
            {/* Close button */}
            <button
              onClick={() => { if (isListening && recognitionRef.current) recognitionRef.current.stop(); setIsVoiceFullscreen(false); }}
              className="absolute top-6 right-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-text-dim hover:text-white hover:bg-white/10 transition-all z-10 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* State label top */}
            <motion.div
              key={state}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
            >
              <span className="text-[9px] font-mono font-black text-text-dim/50 uppercase tracking-[0.5em]">Núcleo JARVAS v3.0</span>
              <span className={`text-base font-black uppercase tracking-[0.3em] ${
                state === 'listening' ? 'text-green-400' :
                state === 'thinking' ? 'text-amber-400' :
                state === 'speaking' ? 'text-accent' : 'text-blue-400'
              }`}>
                {state === 'idle' && 'Pronto / Aguardando'}
                {state === 'listening' && 'Ouvindo...'}
                {state === 'thinking' && 'Processando...'}
                {state === 'speaking' && 'Respondendo...'}
              </span>
            </motion.div>

            {/* Fullscreen Canvas — centred, large */}
            <div className="relative flex items-center justify-center" style={{ width: 'min(80vw, 80vh)', height: 'min(80vw, 80vh)' }}>
              {/* Animated rings */}
              <div className="absolute inset-0 rounded-full border border-accent/10 animate-[spin_35s_linear_infinite] pointer-events-none" />
              <div className="absolute inset-4 rounded-full border border-dashed border-accent/8 animate-[spin_50s_linear_infinite_reverse] pointer-events-none" />
              <div className="absolute inset-[50px] rounded-full border border-accent/5 pointer-events-none" />
              <div className="absolute inset-[100px] rounded-full border-2 border-double border-accent/12 animate-[spin_18s_linear_infinite] pointer-events-none" />
              {/* Crosshair */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-accent/8 pointer-events-none" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-accent/8 pointer-events-none" />
              {/* Scanning line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/30 shadow-[0_0_12px_rgba(230,57,70,0.5)] animate-[scan-line-laser_4s_linear_infinite] pointer-events-none" />
              {/* Corner ticks */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-accent/20 rounded-tl-3xl pointer-events-none" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-accent/20 rounded-tr-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-accent/20 rounded-bl-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-accent/20 rounded-br-3xl pointer-events-none" />
              {/* Target dot */}
              <div className="absolute w-16 h-16 border border-accent/30 rounded-full flex items-center justify-center pointer-events-none animate-pulse">
                <div className="w-2.5 h-2.5 bg-accent rounded-full animate-ping" />
              </div>
              {/* The actual THREE.js canvas for fullscreen */}
              <canvas ref={fullscreenCanvasRef} className="w-full h-full z-10 relative" />
            </div>

            {/* Mic / Mute controls bottom */}
            <div className="absolute bottom-10 flex items-center gap-6">
              <button
                onClick={toggleVoiceInput}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl border-2 cursor-pointer ${
                  isListening
                    ? 'bg-green-500/20 border-green-500 text-green-400 shadow-green-500/20 animate-pulse'
                    : 'bg-white/5 border-white/10 text-text-dim hover:bg-white/10 hover:text-white'
                }`}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <button
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all border cursor-pointer ${
                  isVoiceEnabled
                    ? 'bg-white/5 border-white/10 text-text-dim'
                    : 'bg-accent/10 border-accent/20 text-accent'
                }`}
              >
                {isVoiceEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line-laser {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 0.75; }
          90% { opacity: 0.75; }
          100% { top: 100%; opacity: 0; }
        }
      ` }} />
      
      {/* Upgraded Stark Industries Hologram Console Panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black/45 backdrop-blur-xl border border-accent/15 rounded-[3.5rem] p-8 relative overflow-hidden min-h-[400px] shadow-[0_0_35px_rgba(230,57,70,0.03)]">
        
        {/* Hologram details */}
        <div className="absolute top-8 left-8 flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3 z-20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-accent rounded-full animate-pulse shadow-glow" />
            <span className="text-[10px] font-mono font-black text-text-dim uppercase tracking-[0.4em]">Núcleo JARVAS v3.0</span>
          </div>
          <span className={`text-[8px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
            apiKey && !apiKey.startsWith('AIzaSyA5hctqoPBj')
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {apiKey && !apiKey.startsWith('AIzaSyA5hctqoPBj') ? 'Gemini AI Conectado' : 'Modo Local'}
          </span>
        </div>

        <button 
          onClick={() => setShowSettings(true)}
          className="absolute top-6 right-6 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-text-dim hover:text-white transition-all interactive-button z-20"
          title="Configurações do Jarvis"
        >
          <Settings size={20} />
        </button>

        {/* 3D Canvas element with Iron Man HUD Overlay */}
        <div className="w-[300px] h-[300px] md:w-[420px] md:h-[420px] relative z-10 flex items-center justify-center select-none">
          {/* Glowing background halo */}
          <div className="absolute inset-8 rounded-full bg-accent/5 blur-3xl pointer-events-none transition-all duration-700 animate-pulse" />

          {/* Concentric rotating HUD lines */}
          <div className="absolute inset-0 rounded-full border border-accent/15 animate-[spin_35s_linear_infinite] pointer-events-none scale-100" />
          <div className="absolute inset-2 rounded-full border border-dashed border-accent/10 animate-[spin_50s_linear_infinite_reverse] pointer-events-none scale-95" />
          <div className="absolute inset-[30px] rounded-full border border-accent/5 pointer-events-none scale-85" />
          <div className="absolute inset-[60px] rounded-full border-2 border-double border-accent/15 animate-[spin_18s_linear_infinite] pointer-events-none scale-70" />
          <div className="absolute inset-[100px] rounded-full border border-dashed border-accent/10 animate-[spin_25s_linear_infinite_reverse] pointer-events-none scale-50" />
          
          {/* Tech ticks / corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-accent/25 pointer-events-none rounded-tl-3xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-accent/25 pointer-events-none rounded-tr-3xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-accent/25 pointer-events-none rounded-bl-3xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-accent/25 pointer-events-none rounded-br-3xl" />

          {/* Compass grid crosshair */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-accent/10 pointer-events-none" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-accent/10 pointer-events-none" />
          
          {/* Target lock ticks */}
          <div className="absolute w-14 h-14 border border-accent/40 rounded-full pointer-events-none flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
          </div>

          {/* Scanning line laser sweep */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent/35 shadow-[0_0_12px_rgba(230,57,70,0.6)] animate-[scan-line-laser_4s_linear_infinite] pointer-events-none" />

          {/* Diagnostic status texts */}
          <div className="absolute bottom-4 left-6 text-[8px] font-mono font-black text-accent/50 uppercase tracking-[0.2em] pointer-events-none text-left leading-relaxed">
            SYS_LOCK: ONLINE<br />
            REACTOR_CORE: ACTIVE<br />
            STARK_COGNITIVE_V3
          </div>
          <div className="absolute bottom-4 right-6 text-[8px] font-mono font-black text-accent/50 uppercase tracking-[0.2em] pointer-events-none text-right leading-relaxed">
            FREQ: {state === 'speaking' ? '824.2 MHZ' : state === 'listening' ? '124.9 MHZ' : '0.00 MHZ'}<br />
            CORE_TEMP: 38.6 C<br />
            TELEM: OK
          </div>

          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-pointer z-10 relative"
          />
        </div>

        {/* Visual feedback subtitle */}
        <div className="text-center mt-6 z-10 relative">
          <div className="text-[11px] font-black text-text-dim uppercase tracking-[0.5em] mb-2 opacity-50">Estado do Sistema</div>
          <div className="text-lg font-black uppercase tracking-widest transition-all">
            {state === 'idle' && <span className="text-blue-400">Pronto / Aguardando</span>}
            {state === 'listening' && <span className="text-green-400 animate-pulse">Ouvindo o Senhor...</span>}
            {state === 'thinking' && <span className="text-amber-400">Processando Requisição...</span>}
            {state === 'speaking' && <span className="text-accent">Transmitindo Voz</span>}
          </div>
        </div>

        {/* Speech Controls */}
        <div className="flex items-center gap-6 mt-8 z-10 relative">
          <button
            onClick={toggleVoiceInput}
            className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl border interactive-button ${
              isListening 
                ? 'bg-green-500/20 border-green-500 text-green-400 shadow-green-500/10' 
                : 'bg-white/5 border-white/5 text-text-dim hover:bg-white/10 hover:text-white'
            }`}
            title={isListening ? "Parar de ouvir" : "Falar com o Jarvis"}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border interactive-button ${
              isVoiceEnabled 
                ? 'bg-white/5 border-white/5 text-text-dim hover:bg-accent/10 hover:text-accent' 
                : 'bg-accent/10 border-accent/20 text-accent'
            }`}
            title={isVoiceEnabled ? "Mutar resposta de voz" : "Ativar resposta de voz"}
          >
            {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </div>

      {/* Chat History and Long term memory panel */}
      <div className="w-full lg:w-[450px] flex flex-col gap-6">
        
        {/* Chat box */}
        <div className="flex-1 bg-surface/30 border border-white/5 rounded-[2.5rem] p-6 flex flex-col max-h-[500px] min-h-[400px]">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <Bot size={20} className="text-accent" />
              <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Central de Comunicação</span>
            </div>
            {messages.length > 0 && (
              <button 
                onClick={clearChatHistory}
                className="text-[10px] font-black text-text-dim hover:text-accent uppercase tracking-wider flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-all interactive-button"
              >
                <Trash2 size={12} /> Limpar
              </button>
            )}
          </div>

          {/* Scrolling messages list */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40 select-none">
                <Sparkles size={32} className="mb-3 text-accent" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] max-w-[220px] leading-relaxed text-text-dim">
                  Núcleo ativo. Aguardando suas ordens, Senhor.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={msg.id || index}
                  className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div className={`p-4 rounded-3xl text-sm font-medium leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent/15 border border-accent/20 text-white rounded-tr-none'
                      : 'bg-white/5 border border-white/5 text-text-dim rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-black text-text-dim uppercase tracking-wider mt-1 opacity-50 px-2">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            {loading && (
              <div className="mr-auto items-start flex flex-col max-w-[85%]">
                <div className="p-4 rounded-3xl bg-white/5 border border-white/5 text-text-dim rounded-tl-none flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-accent" />
                  <span className="text-xs tracking-wider uppercase font-black opacity-60">Pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input bar */}
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Fale ou digite para o Jarvis..."
              className="flex-1 h-14 bg-bg border border-white/5 rounded-2xl px-6 outline-none focus:border-accent/40 text-sm tracking-wide transition-all shadow-inner"
              disabled={loading}
            />
            <button
              onClick={() => handleSendMessage()}
              className="w-14 h-14 bg-accent/10 border border-accent/20 text-accent rounded-2xl flex items-center justify-center hover:bg-accent hover:text-white transition-all interactive-button shrink-0"
              disabled={loading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Long term memory facts box */}
        <div className="bg-surface/30 border border-white/5 rounded-[2.5rem] p-6 flex flex-col max-h-[300px]">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4 shrink-0">
            <HelpCircle size={16} className="text-accent" />
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-white">Lembranças Consolidadas</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {facts.length === 0 ? (
              <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] text-center py-6 opacity-30">
                Nenhuma memória de longo prazo consolidada no banco de dados do Nexus.
              </p>
            ) : (
              facts.map((fact) => (
                <div 
                  key={fact.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 group"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-1">
                      {fact.category === 'finance' && '💰 FINANCEIRO'}
                      {fact.category === 'goal' && '🎯 META'}
                      {fact.category === 'general' && '📑 GERAL'}
                      {!fact.category && '⚙️ FATO'}
                    </span>
                    <p className="text-xs text-text-dim font-medium leading-relaxed min-w-0">{fact.fact}</p>
                  </div>
                  <button
                    onClick={() => deleteFact(fact.id)}
                    className="w-8 h-8 rounded-lg bg-white/5 text-text-dim hover:text-accent hover:bg-accent/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all interactive-button shrink-0"
                    title="Apagar lembrança"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal (Gemini API Key) */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => apiKey && setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface border border-white/10 w-full max-w-md rounded-[3rem] p-8 relative z-10 shadow-premium"
            >
              {apiKey && (
                <button 
                  onClick={() => setShowSettings(false)}
                  className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-text-dim hover:text-white hover:bg-accent/10 transition-all interactive-button"
                >
                  <X size={20} />
                </button>
              )}

              <div className="flex flex-col items-center text-center gap-4 mb-8">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent ring-1 ring-accent/30 shadow-glow">
                  <Bot size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter text-white">Configurações de IA</h3>
                  <p className="text-[9px] font-black text-text-dim uppercase tracking-[0.4em] mt-1 opacity-50">Sincronização de Chave do Gemini</p>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-2 opacity-50">Sua Gemini API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Cole sua chave AI Studio aqui..."
                    className="w-full h-14 bg-bg border border-white/5 rounded-2xl px-6 outline-none focus:border-accent text-sm transition-all shadow-inner"
                  />
                  <p className="text-[9px] text-text-dim leading-relaxed px-2">
                    Você pode obter uma chave gratuita no Google AI Studio.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim ml-2 opacity-50">Voz do Jarvis</label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full h-14 bg-bg border border-white/5 rounded-2xl px-6 outline-none focus:border-accent text-sm transition-all shadow-inner text-text-dim"
                  >
                    <option value="">Daniel (Masculino Padrão)</option>
                    {availableVoices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name.replace('Microsoft', '').replace('Google', '').replace('Speech Synthesis', '').trim()} ({voice.lang})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-text-dim leading-relaxed px-2">
                    Escolha a voz que preferir. As vozes nativas do Google/Microsoft são geralmente as mais fluidas e naturais.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full h-14 bg-accent text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-accent-light shadow-lg hover:shadow-accent/20 transition-all interactive-button"
                >
                  Confirmar e Conectar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
