import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cake, Calendar, Gift, Star, Crown, Heart, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { FirestoreService } from '../../services/firestoreService';
import { BirthdayEvent } from '../../types';

const BirthdayManager: React.FC = () => {
  const { childUid } = useAuth();
  const [birthdayHistory, setBirthdayHistory] = useState<BirthdayEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextBirthday, setNextBirthday] = useState<{ date: Date; age: number; daysUntil: number } | null>(null);

  useEffect(() => {
    const loadBirthdayData = async () => {
      if (!childUid) return;
      
      setLoading(true);
      try {
        const history = await FirestoreService.getBirthdayHistory(childUid);
        setBirthdayHistory(history);
        
        // Calculate next birthday
        const today = new Date();
        const currentYear = today.getFullYear();
        const birthdayThisYear = new Date(currentYear, 8, 18); // September 18th (month is 0-indexed)
        
        let nextBirthdayDate: Date;
        let nextAge: number;
        
        if (today <= birthdayThisYear) {
          // Birthday hasn't happened this year
          nextBirthdayDate = birthdayThisYear;
          nextAge = 9; // Heitor is turning 9
        } else {
          // Birthday already happened this year, next is next year
          nextBirthdayDate = new Date(currentYear + 1, 8, 18);
          nextAge = 10; // Next year he'll be 10
        }
        
        const daysUntil = Math.ceil((nextBirthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        setNextBirthday({
          date: nextBirthdayDate,
          age: nextAge,
          daysUntil
        });
        
      } catch (error) {
        console.error('❌ Error loading birthday data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBirthdayData();
  }, [childUid]);

  const triggerTestBirthday = async () => {
    if (!childUid) return;
    
    try {
      const currentYear = new Date().getFullYear();
      const age = currentYear - 2015;
      
      // Mark birthday as not completed to trigger celebration
      await FirestoreService.markBirthdayCompleted(childUid, currentYear - 1, age - 1);
      
      // Reload page to trigger birthday check
      window.location.reload();
    } catch (error) {
      console.error('❌ Error triggering test birthday:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados de aniversário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sistema de Aniversário</h2>
          <p className="text-gray-600">Gerencie celebrações especiais do Heitor</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={triggerTestBirthday}
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Cake className="w-4 h-4" />
          Testar Celebração
        </motion.button>
      </div>

      {/* Next Birthday Countdown */}
      {nextBirthday && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden"
        >
          {/* Background effects */}
          <motion.div
            animate={{
              x: ['-100%', '100%'],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent skew-x-12"
          />
          
          <div className="relative z-10 text-center">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-2xl"
            >
              <Cake className="w-10 h-10 text-pink-600" />
            </motion.div>
            
            <h3 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Comic Neue, cursive' }}>
              🎂 Próximo Aniversário do Heitor! 🎂
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-3xl font-bold">{nextBirthday.daysUntil}</div>
                <div className="text-yellow-300">dias restantes</div>
              </div>
              
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-3xl font-bold">{nextBirthday.age}</div>
                <div className="text-yellow-300">anos completos</div>
              </div>
              
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-lg font-bold">18/12/{nextBirthday.date.getFullYear()}</div>
                <div className="text-yellow-300">data especial</div>
              </div>
            </div>
            
            <p className="text-xl text-yellow-300 leading-relaxed">
              {nextBirthday.daysUntil === 0 ? (
                "🎉 HOJE É O GRANDE DIA! FELIZ ANIVERSÁRIO! 🎉"
              ) : nextBirthday.daysUntil === 1 ? (
                "⚡ Amanhã é o grande dia! Prepare-se para uma celebração épica!"
              ) : nextBirthday.daysUntil <= 7 ? (
                `🚀 Faltam apenas ${nextBirthday.daysUntil} dias para uma celebração incrível!`
              ) : nextBirthday.daysUntil <= 30 ? (
                `⭐ Em ${nextBirthday.daysUntil} dias teremos uma festa especial!`
              ) : (
                `🌟 Ainda faltam ${nextBirthday.daysUntil} dias, mas será uma celebração inesquecível!`
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* Birthday History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-pink-500" />
          Histórico de Aniversários ({birthdayHistory.length})
        </h3>
        
        {birthdayHistory.length > 0 ? (
          <div className="space-y-4">
            {birthdayHistory.map((birthday, index) => (
              <motion.div
                key={birthday.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-pink-200 rounded-lg p-4 bg-pink-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">
                        🎂 {birthday.age} Anos - {birthday.year}
                      </h4>
                      <p className="text-pink-600 font-medium">
                        {birthday.specialMessage}
                      </p>
                      {birthday.celebrationCompletedAt && (
                        <p className="text-sm text-gray-600 mt-1">
                          Celebrado em {birthday.celebrationCompletedAt.toLocaleDateString('pt-BR')} às {birthday.celebrationCompletedAt.toLocaleTimeString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      birthday.celebrationCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {birthday.celebrationCompleted ? '✅ Celebrado' : '⏳ Pendente'}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-1">
                      18 de Dezembro
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎂</div>
            <p className="text-gray-500 text-lg">Nenhum aniversário celebrado ainda</p>
            <p className="text-gray-400 text-sm">As celebrações aparecerão aqui automaticamente</p>
          </div>
        )}
      </motion.div>

      {/* Birthday Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          Configuração do Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-2">📅 Data de Aniversário</h4>
            <p className="text-blue-700 text-lg font-bold">18 de Setembro</p>
            <p className="text-blue-600 text-sm">Data fixa configurada no sistema</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-bold text-purple-900 mb-2">🎁 Recompensas Especiais</h4>
            <ul className="text-purple-700 text-sm space-y-1">
              <li>• XP baseado na idade (idade × 10)</li>
              <li>• Gold baseado na idade (idade × 5)</li>
              <li>• Presentes especiais únicos</li>
              <li>• Celebração personalizada</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <Heart className="w-6 h-6 text-pink-600 mt-1" />
            <div>
              <h4 className="font-bold text-yellow-900 mb-2">💝 Como Funciona o Sistema de Aniversário:</h4>
              <ul className="text-yellow-800 text-sm space-y-1">
                <li>• <strong>Detecção Automática:</strong> O sistema verifica todo dia 18 de setembro</li>
                <li>• <strong>Celebração Única:</strong> Cada ano tem uma celebração especial diferente</li>
                <li>• <strong>Recompensas Crescentes:</strong> Quanto mais velho, maiores as recompensas</li>
                <li>• <strong>Memória Permanente:</strong> Todas as celebrações ficam registradas para sempre</li>
                <li>• <strong>Mensagens Especiais:</strong> Cada aniversário tem uma mensagem personalizada</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BirthdayManager;