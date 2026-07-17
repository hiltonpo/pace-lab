import { useTranslation } from "react-i18next";
import { formatIntervalParts, type IntervalStructure } from "@pace-lab/shared";

export const IntervalLabel = ({
  intervals,
}: {
  intervals: IntervalStructure;
}) => {
  const { t } = useTranslation();
  const p = formatIntervalParts(intervals);

  // 用 i18n 把零件組成句子
  return (
    <>
      {t("plans.detail.intervalFormat", {
        sets: p.sets, // 8
        distance: p.distance, // "1km"
        min: p.recoveryMin, // 3
        recovery: t(`plans.recovery.${p.recoveryType}`), // 多語言
      })}
    </>
  );
};
