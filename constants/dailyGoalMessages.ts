const dailyGoalMessages = [
  "Crushed it! You absolutely destroyed your daily goal today. Keep that momentum rolling! 🚀🔥🏆",
  "Gathering complete! You rounded up every single rep today. Absolute legend status! 🧠✨🏅",
  "Swole patrol! You've put in the work and the gains are coming. Keep flexing those muscles! 💪💥🏋️‍♂️",
  "Streak saver! You didn't just meet the goal, you owned the day. Nothing can stop you now! ⚡👊🔥",
  "Beast mode: ACTIVATED! 🦁 That was an elite performance. Rest up, you earned it! 🔋🦾🏆",
  "Rally cry! Your squad is high-fiving you from afar—you crushed that target. Teamwork makes the dream work! 🤝🙌🌟",
  "Holy rep-tastic! You're basically a superhero. Your daily goal never stood a chance against that hustle. 🦸‍♂️💨⚡",
  "BOOM! 💥 Another day, another goal obliterated. Consider the reps gathered and the challenge defeated. 🎯😎💯",
  "Pure grit, zero quit! You showed up, put in the work, and finished strong. That's how champions are made! 🏅💪🔥",
  "Absolute fire! 🔥 You've set the bar high and cleared it with ease. Tomorrow is just another chance to level up! 🆙🔝💎",
];

export function getDailyGoalMessage(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return dailyGoalMessages[dayOfYear % dailyGoalMessages.length];
}

export default dailyGoalMessages;
