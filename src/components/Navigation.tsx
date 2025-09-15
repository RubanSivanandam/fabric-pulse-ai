// src/components/Navigation.tsx - FIXED: Complete Navigation with GSAP
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { 
  LayoutDashboard, 
  GitBranch, 
  FileText, 
  Brain, 
  AlertTriangle, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAI } from '@/contexts/AIContext';

const navigationItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/hierarchy', icon: GitBranch, label: 'Hierarchy' },
  { path: '/documentation', icon: FileText, label: 'Documentation' },
  { path: '/ai-analytics', icon: Brain, label: 'AI Analytics' },
  { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function Navigation() {
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { state: aiState } = useAI();

  // GSAP Animations on mount
  useEffect(() => {
    const tl = gsap.timeline();
    
    // Animate navigation bar entrance
    tl.from(navRef.current, {
      y: -100,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
    })
    // Animate logo with pulse effect
    .from(logoRef.current, {
      scale: 0,
      rotation: -360,
      duration: 1,
      ease: "elastic.out(1, 0.3)",
    }, "-=0.3")
    // Animate menu items
    .from('.nav-item', {
      x: -50,
      opacity: 0,
      duration: 0.5,
      stagger: 0.1,
      ease: "power2.out",
    }, "-=0.5");

    // Continuous logo pulse animation
    gsap.to(logoRef.current, {
      scale: 1.1,
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: "power2.inOut",
    });

  }, []);

  // Active item animation
  useEffect(() => {
    const activeItem = document.querySelector('.nav-item.active');
    if (activeItem) {
      gsap.to(activeItem, {
        scale: 1.05,
        duration: 0.3,
        ease: "back.out(1.7)",
      });
    }
  }, [location.pathname]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    
    if (!isMenuOpen) {
      gsap.to('.mobile-menu', {
        x: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    } else {
      gsap.to('.mobile-menu', {
        x: '100%',
        duration: 0.3,
        ease: "power2.in",
      });
    }
  };

  const getAlertCount = () => {
    return aiState.insights.filter(insight => 
      insight.type === 'alert' && insight.priority === 'critical'
    ).length;
  };

  return (
    <nav 
      ref={navRef} 
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-900/95 via-purple-900/95 to-blue-900/95 backdrop-blur-md border-b border-blue-500/20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div ref={logoRef} className="flex items-center space-x-3">
            <div className="relative">
              <Zap className="h-8 w-8 text-yellow-400" />
              <div className="absolute inset-0 bg-yellow-400 rounded-full opacity-20 animate-ping"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Fabric Pulse AI
              </h1>
              <p className="text-xs text-blue-300">Production Intelligence</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div ref={menuRef} className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path || 
                              (item.path === '/dashboard' && location.pathname === '/');
              const Icon = item.icon;
              const alertCount = item.path === '/alerts' ? getAlertCount() : 0;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item px-4 py-2 rounded-lg transition-all duration-200 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30 active'
                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                    {alertCount > 0 && (
                      <Badge variant="destructive" className="text-xs animate-pulse">
                        {alertCount}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                  )}
                </Link>
              );
            })}

            {/* AI Status Indicator */}
            <div className="flex items-center space-x-2 ml-4 px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30">
              <Brain className={`h-4 w-4 ${aiState.aiStatus === 'active' ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
              <span className="text-xs text-green-300 font-medium">
                AI {aiState.aiStatus === 'active' ? 'Active' : 'Standby'}
              </span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="text-blue-200 hover:text-white hover:bg-white/10"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="mobile-menu md:hidden fixed top-16 right-0 w-64 h-screen bg-gradient-to-b from-blue-900/98 to-purple-900/98 backdrop-blur-lg border-l border-blue-500/20 transform translate-x-full">
        <div className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path || 
                            (item.path === '/dashboard' && location.pathname === '/');
            const Icon = item.icon;
            const alertCount = item.path === '/alerts' ? getAlertCount() : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                {alertCount > 0 && (
                  <Badge variant="destructive" className="text-xs animate-pulse ml-auto">
                    {alertCount}
                  </Badge>
                )}
              </Link>
            );
          })}
          
          {/* Mobile AI Status */}
          <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 mt-4">
            <Brain className={`h-5 w-5 ${aiState.aiStatus === 'active' ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-green-300 font-medium">
              AI {aiState.aiStatus === 'active' ? 'Active' : 'Standby'}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
