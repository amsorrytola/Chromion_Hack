import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import AnimatedCounter from '../components/AnimatedCounter';

const HomePage: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsLoaded(true);
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: '🌉',
      title: 'Cross-Chain',
      description: 'Adventure across Ethereum, Polygon, and Arbitrum. Form parties with players from any chain.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '🤖',
      title: 'AI-Powered NPCs',
      description: 'Interact with intelligent NPCs powered by ElizaOS. Every conversation is unique and dynamic.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: '💰',
      title: 'DeFi Integration',
      description: 'Lend and borrow equipment using DeFi protocols. Earn yield on your legendary items.',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const stats = [
    { label: 'Active Players', value: 10000, icon: '👥', suffix: '+' },
    { label: 'Chains Supported', value: 3, icon: '⛓️', suffix: '' },
    { label: 'NFTs Created', value: 50000, icon: '🎨', suffix: '+' },
    { label: 'Total Volume', value: 2.5, icon: '💎', prefix: '$', suffix: 'M', decimals: 1 }
  ];

  return (
    <div className="w-full min-h-screen relative overflow-hidden -mt-16 pt-16">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90"></div>
        <div className="absolute inset-0 bg-hero-pattern opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
          
          {/* Floating geometric shapes */}
          <div className="absolute top-10 left-10 w-4 h-4 bg-purple-400 transform rotate-45 animate-float opacity-60" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute top-20 right-20 w-6 h-6 border-2 border-cyan-400 animate-spin opacity-40" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-20 left-20 w-3 h-3 bg-pink-400 rounded-full animate-bounce opacity-70" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-40 right-40 w-5 h-5 bg-yellow-400 transform rotate-12 animate-pulse opacity-50"></div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Hero Section */}
        <section className="flex-1 flex items-center justify-center px-6 py-12">
          <div className={`text-center max-w-6xl mx-auto transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Main Title */}
            <div className="mb-8">
              <div className="mb-6">
                <img 
                  src="/logo.png" 
                  alt="Cross-Chain AI Dungeon Crawler" 
                  className="mx-auto h-24 md:h-32 w-auto transition-all duration-300 hover:scale-105"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.8))' }}
                />
              </div>
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 mx-auto rounded-full"></div>
            </div>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Embark on <span className="text-purple-400 font-semibold">epic adventures</span> across multiple blockchains. 
              Form parties, explore dungeons, collect <span className="text-cyan-400 font-semibold">legendary loot</span>, 
              and interact with <span className="text-pink-400 font-semibold">AI-powered NPCs</span> in this groundbreaking Web3 RPG.
            </p>

            {/* CTA Buttons */}
            <div className="space-y-8 mb-16">
              <div className="flex justify-center">
                <div className="glass-morphism p-4 rounded-2xl">
                  <ConnectButton />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/game"
                  className="group relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl inline-flex items-center gap-3 min-w-[200px] justify-center"
                >
                  <span className="text-2xl group-hover:animate-bounce">🚀</span>
                  <span className="font-game">Start Adventure</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity -z-10"></div>
                </Link>
                
                <button className="group bg-transparent border-2 border-purple-500 hover:border-cyan-500 text-purple-400 hover:text-cyan-400 font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-3 min-w-[200px] justify-center backdrop-blur-sm">
                  <span className="text-2xl group-hover:animate-pulse">📖</span>
                  <span className="font-game">Learn More</span>
                </button>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {stats.map((stat, index) => (
                <div key={index} className={`glass-morphism p-6 rounded-2xl transform transition-all duration-500 hover:scale-105 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`} style={{ transitionDelay: `${index * 100}ms` }}>
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white font-game">
                    {isLoaded && (
                      <AnimatedCounter
                        end={stat.value}
                        prefix={stat.prefix || ''}
                        suffix={stat.suffix || ''}
                        decimals={stat.decimals || 0}
                        duration={2000 + index * 200}
                      />
                    )}
                  </div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-game text-3xl md:text-5xl font-bold text-white mb-4">
                Powered by <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Innovation</span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Experience the future of gaming with cutting-edge blockchain technology and AI
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`group relative glass-morphism p-8 rounded-3xl transition-all duration-500 hover:scale-105 cursor-pointer ${
                    activeFeature === index ? 'ring-2 ring-purple-500 shadow-2xl' : ''
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  {/* Gradient border effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-3xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`}></div>
                  
                  <div className="relative z-10">
                    <div className="text-6xl mb-6 group-hover:animate-bounce">{feature.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-4 font-game">{feature.title}</h3>
                    <p className="text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Interactive indicator */}
                  <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full transition-all duration-300 ${
                    activeFeature === index ? 'bg-purple-500 scale-150' : 'bg-gray-600'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Footer */}
        <section className="py-16 px-6 bg-gradient-to-r from-purple-900/50 to-cyan-900/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="font-game text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Begin Your Journey?
            </h3>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of adventurers already exploring the multiverse
            </p>
            <Link
              to="/game"
              className="group relative bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold py-6 px-12 rounded-full transition-all duration-300 transform hover:scale-110 hover:shadow-2xl inline-flex items-center gap-4 text-xl font-game"
            >
              <span className="text-3xl group-hover:animate-spin">⚔️</span>
              Enter the Dungeon
              <span className="text-3xl group-hover:animate-bounce">🏰</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full blur opacity-50 group-hover:opacity-75 transition-opacity -z-10"></div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
