// useProfileCheckIn.js
// Encapsulates the check-in business state for the personal profile page:
// streak counters, guardian days (persisted), animation flags, and the
// duplicate-check-in alert. Pure presentation of these values lives in
// ProfileHeaderPanel and ProfileCheckInAlert; the calendar side effect
// (scrollTo + highlightToday) is owned by useProfileCalendar and triggered
// by the page after a successful triggerCheckIn.

import { ref } from "vue";

const GUARDIAN_DAYS_KEY = "guardianDays";
const LAST_CHECK_IN_KEY = "lastCheckInDate";
const STREAK_ANIMATION_MS = 1000;
const GUARDIAN_ANIMATION_MS = 600;
const ALERT_DISPLAY_MS = 3000;

export function useProfileCheckIn() {
  const streakDays = ref(42);
  const totalRecycles = ref(156);
  const streakRecord = ref(58);
  const isStreakAnimating = ref(false);
  const hasCheckedInToday = ref(false);
  const showCheckInAlert = ref(false);
  const guardianDays = ref(parseInt(localStorage.getItem(GUARDIAN_DAYS_KEY), 10) || 365);
  const isGuardianDaysUpdating = ref(false);

  function checkTodayCheckIn() {
    const lastCheckInDate = localStorage.getItem(LAST_CHECK_IN_KEY);
    hasCheckedInToday.value = lastCheckInDate === new Date().toDateString();
  }

  function triggerCheckIn() {
    if (hasCheckedInToday.value) {
      showCheckInAlert.value = true;
      setTimeout(() => {
        showCheckInAlert.value = false;
      }, ALERT_DISPLAY_MS);
      return { checkedIn: false };
    }

    isStreakAnimating.value = true;
    setTimeout(() => {
      isStreakAnimating.value = false;
    }, STREAK_ANIMATION_MS);

    isGuardianDaysUpdating.value = true;
    guardianDays.value++;
    localStorage.setItem(GUARDIAN_DAYS_KEY, guardianDays.value.toString());
    setTimeout(() => {
      isGuardianDaysUpdating.value = false;
    }, GUARDIAN_ANIMATION_MS);

    localStorage.setItem(LAST_CHECK_IN_KEY, new Date().toDateString());
    hasCheckedInToday.value = true;

    return { checkedIn: true };
  }

  function resetCheckInForTesting() {
    localStorage.removeItem(LAST_CHECK_IN_KEY);
    hasCheckedInToday.value = false;
  }

  return {
    streakDays,
    totalRecycles,
    streakRecord,
    guardianDays,
    hasCheckedInToday,
    isStreakAnimating,
    isGuardianDaysUpdating,
    showCheckInAlert,
    checkTodayCheckIn,
    triggerCheckIn,
    resetCheckInForTesting,
  };
}
