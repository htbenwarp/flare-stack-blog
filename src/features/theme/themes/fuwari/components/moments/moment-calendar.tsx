import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMomentDatesFn } from "@/features/moments/api/moments.api";

interface MomentCalendarProps {
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
}

export function MomentCalendar({
  selectedDate,
  onDateChange,
}: MomentCalendarProps) {
  const { data: dates = [], isLoading } = useQuery({
    queryKey: ["moment-dates"],
    queryFn: () => getMomentDatesFn(),
    staleTime: 0,                 // 每次都重新获取，确保新动态的日期立即出现
    refetchOnWindowFocus: true,
    initialData: [],
  });


  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 将 dates 转化为 Set 便于快速查询
    const dateSet = new Set(dates.map((d) => d.date));
    const countMap = new Map(dates.map((d) => [d.date, d.count]));

    const cells: Array<{
      day: number | null;
      date: string | null;
      hasMoment: boolean;
      count: number;
    }> = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ day: null, date: null, hasMoment: false, count: 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        date: dateStr,
        hasMoment: dateSet.has(dateStr),
        count: countMap.get(dateStr) || 0,
      });
    }

    return cells;
  }, [dates, currentMonth, currentYear]);


  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="fuwari-card-base p-3 rounded-(--fuwari-radius-large) space-y-2">
      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium fuwari-text-90">
          {currentYear}年{currentMonth + 1}月
        </span>
        <button
          onClick={nextMonth}
          className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 text-center text-[10px] fuwari-text-50">
        {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 text-center gap-0.5">
        {calendarDays.map((cell, idx) => {
          if (cell.day === null) return <div key={idx} className="py-0.5" />;

          const isToday = cell.date === todayStr;
          const isSelected = cell.date === selectedDate;

          return (
            <button
              key={idx}
              onClick={() => onDateChange(isSelected ? null : cell.date)}
              className={`relative py-0.5 text-xs rounded-md transition-colors
                ${isSelected ? "bg-(--fuwari-primary) text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}
                ${isToday ? "ring-1 ring-(--fuwari-primary)" : ""}
                ${!cell.hasMoment && !isToday ? "text-muted-foreground/30" : "fuwari-text-75"}
              `}
            >
              {cell.day}
              {cell.hasMoment && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-(--fuwari-primary)" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          onClick={() => onDateChange(null)}
          className="w-full text-xs text-(--fuwari-primary) hover:underline pt-1"
        >
          清除日期过滤
        </button>
      )}
    </div>
  );
}