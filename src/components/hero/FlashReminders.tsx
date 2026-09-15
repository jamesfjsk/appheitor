import React, { useState } from 'react';
import { FlashReminder } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useSound } from '../../contexts/SoundContext';

const TORCH = '/assets/english/ui/torch.webp';

const COLOR_BAR: Record<FlashReminder['color'], string> = {
  red: '#ff7b6b',
  yellow: '#ffd83d',
  blue: '#5ee0e6',
  green: '#9be36a',
  purple: '#c084fc',
  orange: '#f59e0b',
};

const FlashReminders: React.FC = () => {
  const { flashReminders } = useData();
  const { playClick } = useSound();
  const [isVisible, setIsVisible] = useState(true);

  // Filter reminders that should show on dashboard
  const dashboardReminders = flashReminders.filter(reminder => 
    reminder.active && reminder.showOnDashboard
  );

  return (
    <div className="mc-panel rounded-lg p-4 text-white mc-pop">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="mc-h">
          <img src={TORCH} alt="" className="mc-pixel" draggable={false} />
          Lembretes
        </h3>
        {dashboardReminders.length > 0 && (
          <button
            type="button"
            onClick={() => { playClick(); setIsVisible((v) => !v); }}
            className="mc-btn mc-btn-dark min-h-[44px] px-3 text-sm font-bold"
          >
            {isVisible ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>

      {dashboardReminders.length === 0 ? (
        <div>
          <p className="text-sm text-white/85">Nenhum lembrete ativo no momento</p>
          <p className="text-xs mc-muted mt-1">Peça para o papai adicionar alguns</p>
        </div>
      ) : !isVisible ? (
        <p className="mc-muted">Lembretes ocultos</p>
      ) : (
        <div className="space-y-2">
          {dashboardReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="mc-card p-3 flex items-start gap-3"
              style={{ borderLeft: `4px solid ${COLOR_BAR[reminder.color] || COLOR_BAR.yellow}` }}
            >
              <img src={TORCH} alt="" className="w-8 h-8 mc-pixel shrink-0" draggable={false} />
              <div className="min-w-0">
                <p className="text-base font-bold leading-tight">{reminder.title}</p>
                {reminder.priority === 'high' && (
                  <span className="mc-lbl mc-warn">Importante</span>
                )}
                <p className="text-sm text-white/85 mt-1">{reminder.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashReminders;
