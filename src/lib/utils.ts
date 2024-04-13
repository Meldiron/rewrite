export function hasStreak(streakDate: string | null) {
    if (!streakDate) {
        return false;
    }

    const date = new Date(streakDate);
    const today = new Date();

    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}