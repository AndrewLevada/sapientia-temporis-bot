import express from "express";

export const analyticsServerPort = 8967;

export function startAnalyticsPageServer(): Promise<void> {
  const app = express();

  app.get("*", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${titlesMap[req.path] || req.path}</title>
  <script src="https://www.googletagmanager.com/gtag/js?id=G-HYFTVXK74M"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments);}
    gtag('js', new Date());
  </script>
</head>
<body>
<p>OK</p>
</body>
</html>
`);
  });

  return new Promise<void>(resolve => { app.listen(analyticsServerPort, resolve); });
}

const titlesMap: Record<string, string> = {
  "/start_command": "Добро пожаловать",
  "/help_command": "Помощь",
  "/default": "Главный экран",
  "/settings": "Настройки",
  "/leaderboard_view": "Лидерборд",
  "/timetable_view": "Расписание",
  "/group_change": "Изменение группы",
  "/unrecognized": "Неопознаный текст",
  "/broadcast_response": "Ответ на трансляцию",
  "/feedback_open": "Обратная связь",
  "/feedback_send": "Отправка обратной связи",
  "/notifications": "Уведоиления о заменах",
  "/notifications_change": "Изменение уведомления о заменах",
  "/notifications_time_change": "Изменение времени уведомлений",
};
