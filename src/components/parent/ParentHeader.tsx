import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Save } from 'lucide-react';
import { BrandMark } from '../../icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSound } from '../../contexts/SoundContext';
import { subscribeSettings } from '../../services/settingsService';
import type { TestChildSettings } from '../../types/village';

const ParentHeader: React.FC = () => {
  const { logout, user, childUid, syncData, setViewChildUid } = useAuth();
  const { playClick } = useSound();
  const heitorUid = useRef<string | null>(null);
  const [testChild, setTestChild] = useState<TestChildSettings & { email?: string }>({ uid: null });

  useEffect(() => {
    if (childUid && !heitorUid.current) heitorUid.current = childUid;
  }, [childUid]);

  useEffect(() => {
    return subscribeSettings(
      'testChild',
      { uid: null } as unknown as Record<string, unknown>,
      (v) => setTestChild(v as unknown as TestChildSettings & { email?: string })
    );
  }, []);

  const viewingTest = Boolean(testChild.uid && childUid === testChild.uid);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <BrandMark className="w-12 h-12" />

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Painel Administrativo
            </h1>
            <p className="text-gray-600">
              Bem-vindo, {user?.displayName || 'Admin'}
            </p>
            {childUid && (
              <p className="text-sm text-blue-600">
                Gerenciando filho: {childUid}
              </p>
            )}
            {testChild.uid && heitorUid.current && (
              <div className="mt-2 flex gap-2">
                <span className="text-sm text-gray-700">Ver como:</span>
                <button
                  type="button"
                  className={`text-sm px-2 py-1 rounded ${!viewingTest ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => heitorUid.current && setViewChildUid(heitorUid.current)}
                >
                  Heitor
                </button>
                <button
                  type="button"
                  className={`text-sm px-2 py-1 rounded ${viewingTest ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => testChild.uid && setViewChildUid(testChild.uid)}
                >
                  Conta de teste
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playClick();
              syncData();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
            title="Salvar e sincronizar dados"
          >
            <Save className="w-4 h-4" />
            Sincronizar
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              playClick();
              logout();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all duration-200 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};

export default ParentHeader;
