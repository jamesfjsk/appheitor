import React, { useState, useEffect } from 'react';
import { getTodayBrazil, getBrazilDate, getTodayStartBrazil, getYesterdayBrazil } from '../../utils/timezone';

const TimezoneTest: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const utcNow = new Date();
  const brazilNow = getBrazilDate();
  const todayBrazil = getTodayBrazil();
  const todayStart = getTodayStartBrazil();
  const { date: yesterday, dateString: yesterdayString } = getYesterdayBrazil();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">🕐 Teste de Timezone (Brasil GMT-3)</h2>

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Horário Atual:</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">UTC (Sistema):</span>
              <span className="font-mono font-semibold">{utcNow.toISOString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Brasil (GMT-3):</span>
              <span className="font-mono font-semibold text-green-600">{brazilNow.toISOString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Navegador Local:</span>
              <span className="font-mono font-semibold">{currentTime.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Datas Usadas no Sistema:</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Hoje (Brasil):</span>
              <span className="font-mono font-semibold text-green-600">{todayBrazil}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Ontem (Brasil):</span>
              <span className="font-mono font-semibold">{yesterdayString}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Início do dia (Brasil):</span>
              <span className="font-mono font-semibold">{todayStart.toISOString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-900 mb-2">Comportamento Esperado:</h3>
          <ul className="text-sm space-y-1 list-disc list-inside text-gray-700">
            <li>O sistema usa <strong>GMT-3 (Brasil)</strong> para todas as operações</li>
            <li>As tarefas resetam à <strong>meia-noite brasileira</strong> (00:00 GMT-3)</li>
            <li>O processamento diário roda à <strong>meia-noite brasileira</strong></li>
            <li>Às 21:00 Brasil, a data ainda é <strong>o mesmo dia</strong></li>
            <li>Às 00:00 Brasil, a data muda e as tarefas resetam</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">Comparação de Timezones:</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-700">UTC Hora:</span>
              <span className="font-mono">{utcNow.getUTCHours()}:{String(utcNow.getUTCMinutes()).padStart(2, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Brasil Hora:</span>
              <span className="font-mono font-semibold text-purple-600">
                {brazilNow.getUTCHours()}:{String(brazilNow.getUTCMinutes()).padStart(2, '0')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Diferença:</span>
              <span className="font-semibold">-3 horas</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Teste Prático:</h3>
          <div className="text-sm space-y-2 text-gray-700">
            <p>
              <strong>Se agora são 21:00 no Brasil:</strong>
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li>UTC seria: 00:00 (próximo dia) ❌</li>
              <li>Brasil GMT-3: 21:00 (mesmo dia) ✅</li>
              <li>Sistema usa: <span className="font-mono bg-green-100 px-2 py-1 rounded">{todayBrazil}</span> ✅</li>
            </ul>
            <p className="mt-2">
              <strong>Resultado:</strong> Suas tarefas <span className="text-green-600 font-semibold">NÃO resetam às 21:00!</span>
            </p>
          </div>
        </div>

        <div className="text-xs text-gray-500 border-t pt-3">
          <p>📍 Este componente atualiza a cada 1 segundo para mostrar valores em tempo real.</p>
        </div>
      </div>
    </div>
  );
};

export default TimezoneTest;
