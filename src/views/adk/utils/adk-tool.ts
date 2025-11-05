export function getSessionListByDays(
  currentSession: any,
  session_list: any[],
  daysRangeStart: number,
  daysRangeEnd: number
) {
  const nowTimestamp = Date.now();
  return session_list.filter(session => {
    const sessionTimestamp = session.lastUpdateTime * 1000;
    const diffInDays =
      (nowTimestamp - sessionTimestamp) / (1000 * 60 * 60 * 24);
    // console.log("diffInDays", diffInDays, daysRangeStart, daysRangeEnd);
    return (
      diffInDays >= daysRangeStart &&
      diffInDays < daysRangeEnd &&
      (session.id === currentSession.id ||
        Object.keys(session.state).length > 0)
    );
  });
}
