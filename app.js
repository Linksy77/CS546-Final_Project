import express from 'express';
import { engine as exphbs } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.engine('handlebars', exphbs({
  helpers: {
    increment: (val) => Number(val) + 1,
    decrement: (val) => Math.max(1, Number(val) - 1)
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

routes(app);

app.use((req, res) => {
  res.status(404).render('home', { title: 'Noise Complaint Detective', complaints: [], message: 'Page not found.' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
