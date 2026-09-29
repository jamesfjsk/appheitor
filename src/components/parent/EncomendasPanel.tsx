import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Assignment, AssignmentDraft, AssignmentRecurrence } from '../../types/assignment';
import { subscribeAssignments, subscribeRecurrences } from '../../services/assignmentsService';
import EncomendasConferir from './EncomendasConferir';
import EncomendasCriar from './EncomendasCriar';
import EncomendasRecorrentes from './EncomendasRecorrentes';
import EncomendasTrabalho from './EncomendasTrabalho';

const EncomendasPanel: React.FC = () => {
  const { childUid } = useAuth();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [recs, setRecs] = useState<AssignmentRecurrence[]>([]);
  const [seed, setSeed] = useState<AssignmentDraft | null>(null);

  useEffect(() => {
    if (!childUid) return;
    const stopRows = subscribeAssignments(childUid, setRows);
    const stopRecs = subscribeRecurrences(childUid, setRecs);
    return () => {
      stopRows();
      stopRecs();
    };
  }, [childUid]);

  if (!childUid) return <p className="text-sm text-gray-500">Sem criança ligada a este painel.</p>;

  return (
    <div className="space-y-6">
      <EncomendasConferir uid={childUid} rows={rows} onExecution={setSeed} />
      <EncomendasCriar uid={childUid} rows={rows} seed={seed} onSeedUsed={() => setSeed(null)} />
      <EncomendasRecorrentes uid={childUid} rows={recs} />
      <EncomendasTrabalho rows={rows} />
    </div>
  );
};

export default EncomendasPanel;
