import { useState } from 'react';
import { AttendanceAttritionAnalyticsCard } from '../components/home/AttendanceAttritionAnalyticsCard';
import { ProblemsSolvedCard } from '../components/home/ProblemsSolvedCard';
import { SelectedProblemDetailsCard } from '../components/home/SelectedProblemDetailsCard';
import { StageDetailModal } from '../components/home/StageDetailModal';
import { SystemArchitecturePipelineCard } from '../components/home/SystemArchitecturePipelineCard';

export function Home() {
  const [selectedProblem, setSelectedProblem] = useState('shortages'); // Default to Problem 01: Workforce Shortages
  const [inspectionStage, setInspectionStage] = useState(null); // Stage inspection modal state

  return (
    <div className="space-y-3 pb-4 relative select-none">
      {/* 2x2 Grid Layout: Top Row & Bottom Row */}
      {/* Top Row: System Architecture Pipeline (Left) & Problems Solved by Agents (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        <SystemArchitecturePipelineCard
          className="lg:col-span-7 xl:col-span-8"
          onInspectStage={(stage) => setInspectionStage(stage)}
        />
        <ProblemsSolvedCard
          className="lg:col-span-5 xl:col-span-4"
          selectedProblem={selectedProblem}
          onSelectProblem={setSelectedProblem}
        />
      </div>

      {/* Bottom Row: Selected Problem Details (Left) & Attendance and Attrition Analytics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
        <SelectedProblemDetailsCard
          selectedProblem={selectedProblem}
        />
        <AttendanceAttritionAnalyticsCard />
      </div>

      {/* Interactive Architecture Stage Details Modal */}
      {inspectionStage && (
        <StageDetailModal
          stage={inspectionStage}
          onClose={() => setInspectionStage(null)}
        />
      )}
    </div>
  );
}

export default Home;
