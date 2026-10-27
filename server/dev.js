import "dotenv/config";
import app from "./app.js";
app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log("Fieldwise API: http://127.0.0.1:3001"),
);
