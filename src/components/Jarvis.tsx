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
  
  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const stateRef = useRef<JarvisState>('idle');
  
  // Keep stateRef in sync to access in WebGL loop
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load API Key, messages, and facts on mount
  useEffect(() => {
    const savedKey = getGeminiApiKey();
    setApiKey(savedKey);

    const loadData = async () => {
      const loadedMessages = await storage.getJarvasMessages();
      const loadedFacts = await storage.getJarvasFacts();
      setMessages(loadedMessages);
      setFacts(loadedFacts);
    };
    loadData();

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

  // 3D Three.js Particle Swarm Canvas Setup
  useEffect(() => {
    if (!canvasRef.current) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.5;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Particle Swarm Configuration - Upgraded to Concentric Gyroscopic Rings (Stark HUD)
    const count = 20000;
    const geom = new THREE.BoxGeometry(0.015, 0.015, 0.015);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff, // Neon Cyan
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.InstancedMesh(geom, mat, count);
    scene.add(mesh);

    // Distribute particles in gyroscopic rings and a central reactor core
    const particles: {
      type: 'core' | 'ring1' | 'ring2' | 'ring3' | 'radar';
      x: number;
      y: number;
      z: number;
      speed: number;
      phase: number;
      radius: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      let type: 'core' | 'ring1' | 'ring2' | 'ring3' | 'radar' = 'core';
      let x = 0, y = 0, z = 0;
      const radiusVal = 1.0 + Math.random() * 0.4;

      if (i < 6000) {
        // Reactor Core Sphere
        type = 'core';
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 0.4 + Math.random() * 0.15;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else if (i < 11000) {
        // Ring 1 (Horizontal Orbit)
        type = 'ring1';
        const theta = Math.random() * Math.PI * 2;
        const r = 1.25 + Math.random() * 0.05;
        x = r * Math.cos(theta);
        y = (Math.random() - 0.5) * 0.015;
        z = r * Math.sin(theta);
      } else if (i < 15500) {
        // Ring 2 (Vertical Pitch Orbit)
        type = 'ring2';
        const theta = Math.random() * Math.PI * 2;
        const r = 1.35 + Math.random() * 0.05;
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = (Math.random() - 0.5) * 0.015;
      } else if (i < 18500) {
        // Ring 3 (Diagonal Gyro Orbit)
        type = 'ring3';
        const theta = Math.random() * Math.PI * 2;
        const r = 1.45 + Math.random() * 0.05;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        x = r * cos;
        y = r * sin * 0.707;
        z = r * sin * 0.707;
      } else {
        // Radar Sweep Planar Dots
        type = 'radar';
        const theta = Math.random() * Math.PI * 2;
        const r = 0.2 + Math.random() * 1.2;
        x = r * Math.cos(theta);
        y = r * Math.sin(theta);
        z = (Math.random() - 0.5) * 0.01;
      }

      particles.push({
        type,
        x, y, z,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        radius: radiusVal
      });
    }

    const dummy = new THREE.Object3D();
    const pColor = new THREE.Color();
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      const time = clock.getElapsedTime();
      const currentState = stateRef.current;

      // Holographic Stark colors based on Jarvis state
      let colorHex = 0x00d2ff; // Cyan (Idle)
      let speedMult = 1.0;

      if (currentState === 'listening') {
        colorHex = 0x00ffaa; // Neon Green-Cyan
        speedMult = 1.8;
      } else if (currentState === 'thinking') {
        colorHex = 0xffcc00; // Stark Gold
        speedMult = 3.0;
      } else if (currentState === 'speaking') {
        colorHex = 0xff2a4b; // Stark Red
        speedMult = 2.0;
      }

      for (let i = 0; i < count; i++) {
        const p = particles[i];
        let x = p.x;
        let y = p.y;
        let z = p.z;

        if (p.type === 'core') {
          // Pulse the core
          const factor = 1.0 + Math.sin(time * 3 + p.phase) * 0.08;
          if (currentState === 'speaking') {
            const pulse = 1.0 + Math.sin(time * 18 + p.phase) * 0.25;
            x = p.x * factor * pulse;
            y = p.y * factor * pulse;
            z = p.z * factor * pulse;
          } else if (currentState === 'listening') {
            const sonar = 1.0 + Math.sin(time * 10 + p.phase) * 0.15;
            x = p.x * factor * sonar;
            y = p.y * factor * sonar;
            z = p.z * factor * sonar;
          } else {
            x = p.x * factor;
            y = p.y * factor;
            z = p.z * factor;
          }
        } else if (p.type === 'ring1') {
          // Ring 1: Spin around Y-axis
          const spinAngle = p.phase + time * 0.25 * speedMult;
          const r = Math.sqrt(p.x * p.x + p.z * p.z);
          let wave = 0;
          if (currentState === 'speaking') {
            wave = Math.sin(spinAngle * 8 + time * 12) * 0.12;
          } else if (currentState === 'listening') {
            wave = Math.sin(spinAngle * 4 + time * 6) * 0.08;
          }
          x = (r + wave) * Math.cos(spinAngle);
          y = p.y + wave * 0.25;
          z = (r + wave) * Math.sin(spinAngle);
        } else if (p.type === 'ring2') {
          // Ring 2: Spin around Z-axis
          const spinAngle = p.phase - time * 0.18 * speedMult; // opposite rotation
          const r = Math.sqrt(p.x * p.x + p.y * p.y);
          let wave = 0;
          if (currentState === 'speaking') {
            wave = Math.cos(spinAngle * 8 + time * 12) * 0.12;
          }
          x = (r + wave) * Math.cos(spinAngle);
          y = (r + wave) * Math.sin(spinAngle);
          z = p.z + wave * 0.25;
        } else if (p.type === 'ring3') {
          // Ring 3: Spin diagonally
          const spinAngle = p.phase + time * 0.2 * speedMult;
          const r = Math.sqrt(p.x * p.x + (p.y * p.y + p.z * p.z));
          let wave = 0;
          if (currentState === 'speaking') {
            wave = Math.sin(spinAngle * 6 + time * 12) * 0.1;
          }
          const cos = Math.cos(spinAngle);
          const sin = Math.sin(spinAngle);
          x = (r + wave) * cos;
          y = (r + wave) * sin * 0.707;
          z = (r + wave) * sin * 0.707;
        } else if (p.type === 'radar') {
          // Radar scan line sweeping through
          const r = Math.sqrt(p.x * p.x + p.y * p.y);
          const sweepAngle = (time * 0.8 * speedMult) % (Math.PI * 2);
          const diff = Math.abs((Math.atan2(p.y, p.x) - sweepAngle + Math.PI * 2) % (Math.PI * 2));
          const glow = Math.max(0, 1 - diff * 2.5);
          x = p.x;
          y = p.y;
          z = p.z + glow * 0.18;
        }

        dummy.position.set(x, y, z);

        // Resize and scaling based on state
        let scale = 1.0;
        if (p.type === 'core') {
          if (currentState === 'thinking') {
            scale = 0.7 + Math.sin(time * 8 + p.phase) * 0.1;
          } else if (currentState === 'speaking') {
            scale = 0.9 + Math.random() * 0.5;
          }
        } else {
          if (currentState === 'thinking') {
            scale = 0.8;
          }
        }
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        pColor.setHex(colorHex);
        mesh.setColorAt(i, pColor);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

      // Soft rotation of the overall group
      mesh.rotation.y = time * 0.05;
      mesh.rotation.x = time * 0.02;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      geom.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  // Text-To-Speech (TTS) voice builder
  const speakText = (text: string) => {
    if (!window.speechSynthesis || !isVoiceEnabled) return;
    
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setState('speaking');

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find pt-BR voice strictly first to avoid European Portuguese (Portugal)
    const voices = window.speechSynthesis.getVoices();
    let ptBrVoices = voices.filter(v => 
      v.lang.toLowerCase() === 'pt-br' || 
      v.lang.toLowerCase().replace('_', '-') === 'pt-br'
    );

    // Fallback to any Portuguese voice if no strict pt-BR is found
    if (ptBrVoices.length === 0) {
      ptBrVoices = voices.filter(v => v.lang.toLowerCase().startsWith('pt'));
    }
    
    // Look for masculine Google / Microsoft / system voices
    let maleVoice = ptBrVoices.find(v => 
      v.name.toLowerCase().includes('daniel') || 
      v.name.toLowerCase().includes('microsoft daniel') ||
      v.name.toLowerCase().includes('google') ||
      v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('homem') ||
      v.name.toLowerCase().includes('masculino')
    );

    // Do NOT choose female named voices if we want a male voice
    if (maleVoice && (
      maleVoice.name.toLowerCase().includes('female') || 
      maleVoice.name.toLowerCase().includes('maria') || 
      maleVoice.name.toLowerCase().includes('leticia') || 
      maleVoice.name.toLowerCase().includes('francisca') || 
      maleVoice.name.toLowerCase().includes('helena') ||
      maleVoice.name.toLowerCase().includes('luciana')
    )) {
      maleVoice = undefined;
    }

    if (!maleVoice && ptBrVoices.length > 0) {
      maleVoice = ptBrVoices[0]; // Fallback to first available Brazilian Portuguese voice
    }

    if (maleVoice) {
      utterance.voice = maleVoice;
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
      recognitionRef.current.start();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      saveGeminiApiKey(apiKey.trim());
      setShowSettings(false);
    }
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

          <canvas ref={canvasRef} className="w-full h-full cursor-pointer z-10 relative" />
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
              <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30 select-none">
                <Sparkles size={36} className="mb-4 text-accent" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] max-w-[250px] leading-relaxed">
                  "Olá, Senhor. Meu núcleo está ativo. Como posso ajudá-lo em seus negócios hoje?"
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
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Cole sua chave AI Studio aqui..."
                    className="w-full h-14 bg-bg border border-white/5 rounded-2xl px-6 outline-none focus:border-accent text-sm transition-all shadow-inner"
                  />
                  <p className="text-[9px] text-text-dim leading-relaxed px-2">
                    A chave de API é armazenada de forma segura e local apenas no seu navegador. Você pode obter uma chave gratuita no Google AI Studio.
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
