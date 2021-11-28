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
  <title>${req.query.pageTitle}</title>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HYFTVXK74M"></script>
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
