import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { usePunishment } from '../../contexts/PunishmentContext';
import { useData } from '../../contexts/DataContext';
import { FirestoreService } from '../../services/firestoreService';
import LoadingSpinner from '../common/LoadingSpinner';
import { ReadyBoot } from '../common/useDismissBoot';
import { PunishmentTaskCompletion, Task } from '../../types';

const CREEPER = '/assets/english/ui/creeper.webp';
const CLOCK = '/assets/english/ui/clock.webp';
const MAP = '/assets/english/ui/map.webp';

const PunishmentModeScreen: React.FC = () => {
  const {
    punishment,
    isPunished,
    loading,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    completePunishmentTask
  } = usePunishment();

  const { tasks } = useData();

  const [isCompleting, setIsCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [, setSelectedTask] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<PunishmentTaskCompletion[]>([]);

  useEffect(() => {
    if (!punishment) return;

    const unsubscribe = FirestoreService.subscribeToPunishmentTaskHistory(
      punishment.id,
      (history) => {
        setTaskHistory(history);
      }
    );

    return () => unsubscribe();
  }, [punishment]);

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  if (!isPunished || !punishment) {
    return null;
  }

  const tasksCompleted = punishment.tasksCompleted || 0;
  const tasksProgress = (tasksCompleted / 30) * 100;
  const totalTimeInMs = punishment.endDate.getTime() - punishment.startDate.getTime();
  const elapsedTimeInMs = Date.now() - punishment.startDate.getTime();
  const timeProgress = Math.min((elapsedTimeInMs / totalTimeInMs) * 100, 100);

  const handleOpenTaskModal = () => {
    setShowTaskModal(true);
  };

  const handleSelectTask = async (task: Task) => {
    setSelectedTask(task);
    setIsCompleting(true);
    setShowTaskModal(false);

    try {
      await completePunishmentTask(task.id, task.title);

      if (tasksCompleted + 1 >= 30) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsCompleting(false);
      setSelectedTask(null);
    }
  };

  const getMotivationalMessage = () => {
    if (tasksCompleted >= 25) {
      return "Quase lá. Continue firme.";
    } else if (tasksCompleted >= 20) {
      return "Você está indo bem. Não desista.";
    } else if (tasksCompleted >= 15) {
      return "Metade do caminho completa.";
    } else if (tasksCompleted >= 10) {
      return "Bom progresso. Continue assim.";
    } else if (tasksCompleted >= 5) {
      return "Você está no caminho certo.";
    } else {
      return "Comece agora e mostre seu compromisso.";
    }
  };

  const activeTasks = tasks.filter(t => t.active);
  const periodLabel = (period: Task['period']) =>
    period === 'morning' ? 'Manhã' : period === 'afternoon' ? 'Tarde' : 'Noite';
  const freqLabel = (frequency: Task['frequency']) =>
    frequency === 'daily' ? 'Diário' : frequency === 'weekday' ? 'Dias úteis' : 'Fim de semana';

  return (
    <>
      <ReadyBoot />
      <div className="mn-page overflow-auto">
        <div className="relative z-10 min-h-screen flex items-start justify-center p-4 py-8">
          <div className="max-w-4xl w-full space-y-4">
            <div className="mc-panel rounded-lg p-5 text-center">
              <img src={CREEPER} alt="" className="w-20 h-20 mx-auto mb-3 mc-pixel" draggable={false} />
              <h1 className="mc-title text-base sm:text-lg mb-3">Modo punição</h1>
              <div className="mc-card rounded p-4 mb-3">
                <p className="font-bold text-white text-lg">Desobediência / desrespeito</p>
                <p className="text-sm text-white/85 mt-1">Motivo: {punishment.reason}</p>
              </div>
              <p className="text-white/85">Para recuperar o acesso ao painel, você precisa:</p>
              <p className="mc-num mt-2 text-[#ffd83d]" style={{ fontSize: 14 }}>30 tarefas ou 7 dias</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="mc-panel rounded-lg p-4">
                <h3 className="mc-h mb-3">
                  <img src={CLOCK} alt="" className="mc-pixel" draggable={false} />
                  Tempo
                </h3>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: 'Dias', value: daysRemaining },
                    { label: 'Horas', value: hoursRemaining },
                    { label: 'Min', value: minutesRemaining },
                    { label: 'Seg', value: secondsRemaining }
                  ].map((item) => (
                    <div key={item.label} className="mc-slot p-2 text-center">
                      <div className="mc-num">{String(item.value).padStart(2, '0')}</div>
                      <div className="text-xs mc-muted">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mc-bar">
                  <div className="mc-bar-fill is-gold" style={{ width: `${timeProgress}%` }} />
                </div>
                <p className="text-xs mc-muted text-center mt-2">
                  Fim: {new Date(punishment.endDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="mc-panel rounded-lg p-4">
                <h3 className="mc-h mb-3">Tarefas</h3>
                <p className="mc-num text-center mb-2" style={{ fontSize: 28 }}>{tasksCompleted}/30</p>
                <div className="mc-card rounded p-3 mb-3 text-center text-white/90">
                  {getMotivationalMessage()}
                </div>
                <div className="mc-bar mb-3">
                  <div className="mc-bar-fill" style={{ width: `${tasksProgress}%` }} />
                </div>
                <button
                  type="button"
                  onClick={handleOpenTaskModal}
                  disabled={isCompleting}
                  className="mc-btn mc-btn-green w-full py-3 font-bold"
                >
                  {isCompleting ? 'Marcando...' : 'Marcar tarefa completada'}
                </button>
                {punishment.lastTaskCompletedAt && (
                  <p className="text-xs mc-muted text-center mt-3">
                    Última: {new Date(punishment.lastTaskCompletedAt).toLocaleTimeString('pt-BR')}
                    <br />
                    Aguarde 30 minutos
                  </p>
                )}
              </div>

              <div className="mc-panel rounded-lg p-4">
                <h3 className="mc-h mb-3">Histórico</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {taskHistory.length === 0 ? (
                    <p className="text-sm mc-muted text-center py-4">Nenhuma tarefa completada ainda</p>
                  ) : (
                    taskHistory.map((item) => (
                      <div key={item.id} className="mc-card rounded p-3">
                        <p className="font-bold text-sm text-white">#{item.taskNumber} {item.taskTitle}</p>
                        <p className="text-xs mc-muted mt-1">
                          {new Date(item.completedAt).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mc-card rounded-lg p-4">
              <p className="font-bold text-[#ffd83d] mb-2">Dicas para completar as tarefas</p>
              <ul className="space-y-1 text-sm text-white/90">
                <li>Complete tarefas reais (arrumar o quarto, fazer dever, ajudar em casa).</li>
                <li>Mostre responsabilidade e compromisso com as obrigações.</li>
                <li>Respeite seus pais e siga as regras da casa.</li>
                <li>Você pode marcar uma tarefa a cada 30 minutos.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showTaskModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowTaskModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mc-panel rounded-lg p-5 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="mc-title text-sm">Selecione a tarefa realizada</h2>
              <button type="button" onClick={() => setShowTaskModal(false)} className="mc-btn mc-btn-dark w-11 h-11 p-0" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/85 mb-3">Escolha qual tarefa você completou:</p>
            <div className="mc-inv rounded-lg p-3 overflow-y-auto flex-1 space-y-2">
              {activeTasks.length === 0 ? (
                <p className="text-center mc-muted py-8">Nenhuma tarefa disponível no momento</p>
              ) : (
                activeTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => handleSelectTask(task)}
                    className="mc-row rounded p-3 w-full text-left"
                  >
                    <h3 className="text-[17px] font-bold">{task.title}</h3>
                    {task.description && (
                      <p className="text-[13px] mc-muted mt-0.5">{task.description}</p>
                    )}
                    <p className="text-xs mc-muted mt-1">
                      {periodLabel(task.period)} · {freqLabel(task.frequency)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showCelebration && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className="mc-panel rounded-lg p-6 text-center mc-pop max-w-md">
            <img src={MAP} alt="" className="w-12 h-12 mx-auto mb-3 mc-pixel" draggable={false} />
            <h2 className="mc-title text-sm mb-2">Parabéns</h2>
            <p className="text-white/90">Você completou 30 tarefas.</p>
            <p className="text-sm mc-muted mt-1">Você está livre agora.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default PunishmentModeScreen;
