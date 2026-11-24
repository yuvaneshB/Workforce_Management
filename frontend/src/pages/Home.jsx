import { useEffect, useRef, useState } from 'react';
import { AttendanceAttritionAnalyticsCard } from '../components/home/AttendanceAttritionAnalyticsCard';
import { ProblemsSolvedCard } from '../components/home/ProblemsSolvedCard';
import { SystemArchitecturePipelineCard } from '../components/home/SystemArchitecturePipelineCard';
import { UnifiedDetailsCard } from '../components/home/UnifiedDetailsCard';

export function Home() {
  // Single shared selection across Pipeline sub-cards and Problems list
  // Default selection: first pipeline sub-card ('erp')
  const [selected, setSelected] = useState({ type: 'stage', id: 'erp' });
  const detailsRef = useRef(null);

  const handleSelect = (nextSelected) => {
    setSelected(nextSelected);
    // Smoothly scroll Details card into view on small or stacked viewports
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Lock body/main scroll only when in fixed-layout mode (lg and height >= 760px)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px) and (min-height: 760px)');
    const handleResize = () => {
      const main = document.querySelector('main');
      if (main) {
        if (mql.matches) {
          main.style.overflow = 'hidden';
        } else {
          main.style.overflow = '';
        }
      }
    };
    handleResize();
    mql.addEventListener('change', handleResize);
    return () => {
      mql.removeEventListener('change', handleResize);
      const main = document.querySelector('main');
      if (main) main.style.overflow = '';
    };
  }, []);

  return (
    <div className="home-page-container w-full select-none">
      <style>{`
        /* Desktop with viewport height >= 760px: 100vh - header, no page scroll, 2x2 grid */
        @media (min-width: 1024px) and (min-height: 760px) {
          .home-page-container {
            height: calc(100vh - 4.5rem) !important;
            max-height: calc(100vh - 4.5rem) !important;
            overflow: hidden !important;
            padding-bottom: 0.5rem !important;
          }
          .home-grid-layout {
            display: grid !important;
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) !important;
            grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr) !important;
            gap: 1rem !important;
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          main:has(.home-page-container) {
            overflow: hidden !important;
          }
          main:has(.home-page-container) > div {
            padding-bottom: 0 !important;
            height: 100% !important;
          }
        }

        /* Desktop with viewport height < 760px: preserve 2 columns (2fr 1fr), normal page scroll */
        @media (min-width: 1024px) and (max-height: 759px) {
          .home-page-container {
            padding-bottom: 2.5rem;
          }
          .home-grid-layout {
            display: grid !important;
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) !important;
            gap: 1rem !important;
          }
        }

        /* Mobile / tablet (< 1024px width): 1-column stacked layout with page scroll */
        @media (max-width: 1023px) {
          .home-page-container {
            padding-bottom: 2.5rem;
          }
          .home-grid-layout {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
        }
      `}</style>

      <div className="home-grid-layout w-full">
        {/* ROW 1 Left (about 2/3): System Architecture Pipeline */}
        <SystemArchitecturePipelineCard
          className="min-h-0 flex flex-col overflow-hidden h-full"
          selected={selected}
          onSelect={handleSelect}
        />

        {/* ROW 1 Right (about 1/3): Problems Solved by Agents */}
        <ProblemsSolvedCard
          className="min-h-0 flex flex-col overflow-hidden h-full"
          selected={selected}
          onSelect={handleSelect}
        />

        {/* ROW 2 Left (about 2/3): Details Card */}
        <UnifiedDetailsCard
          ref={detailsRef}
          className="min-h-0 flex flex-col overflow-hidden h-full"
          selected={selected}
        />

        {/* ROW 2 Right (about 1/3): Attendance & Attrition Analytics */}
        <AttendanceAttritionAnalyticsCard
          className="min-h-0 flex flex-col overflow-hidden h-full"
        />
      </div>
    </div>
  );
}

export default Home;
