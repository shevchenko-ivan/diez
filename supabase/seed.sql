-- Seed: published songs migrated from the initial mock data.
-- Run after 001_schema.sql has been applied.
-- All songs are inserted with status = 'published' and no submitted_by
-- (admin-seeded content for MVP).

INSERT INTO songs (
  slug, title, artist, album, genre, key, capo, tempo,
  difficulty, chords, views, sections, strumming, cover_image, youtube_id, status
) VALUES
(
  'obiymy',
  'Обійми',
  'Океан Ельзи',
  'Земля',
  'Рок',
  'Am',
  0,
  76,
  'easy',
  ARRAY['Am', 'F', 'C', 'G'],
  12400,
  '[
    {
      "label": "Куплет 1",
      "lines": [
        {"chords": ["Am", "", "", "F", "", ""], "lyrics": "Обійми мене, обійми"},
        {"chords": ["C", "", "", "G", "", ""], "lyrics": "Так, як ти вмієш тільки ти"},
        {"chords": ["Am", "", "", "F", "", ""], "lyrics": "Обійми мене і лети"},
        {"chords": ["C", "", "G", "", "Am", ""], "lyrics": "Зі мною в небо, в небо"}
      ]
    },
    {
      "label": "Приспів",
      "lines": [
        {"chords": ["F", "", "", "C", "", ""], "lyrics": "Ти моя, моя земля"},
        {"chords": ["G", "", "", "Am", "", ""], "lyrics": "Ти моє тепле вогнище"},
        {"chords": ["F", "", "", "C", "", ""], "lyrics": "Ти моя, моя зоря"},
        {"chords": ["G", "", "", "", "", ""], "lyrics": "Що веде мене додому"}
      ]
    },
    {
      "label": "Куплет 2",
      "lines": [
        {"chords": ["Am", "", "", "F", "", ""], "lyrics": "Обійми мене, обійми"},
        {"chords": ["C", "", "", "G", "", ""], "lyrics": "Серед ночі і гризоти"},
        {"chords": ["Am", "", "", "F", "", ""], "lyrics": "Обійми і я знайду"},
        {"chords": ["C", "", "G", "", "Am", ""], "lyrics": "Дорогу крізь всі тумани"}
      ]
    },
    {
      "label": "Аутро",
      "lines": [
        {"chords": ["Am", "F", "C", "G"], "lyrics": "× 4"}
      ]
    }
  ]'::jsonb,
  ARRAY['D', 'D', 'U', 'U', 'D', 'U'],
  '/songs/obiymy.png',
  '8OmsKeIikm0',
  'published'
),
(
  'strilyaly-ochi',
  'Стріляли очі',
  'Скрябін',
  NULL,
  'Поп-рок',
  'Dm',
  NULL,
  NULL,
  'medium',
  ARRAY['Dm', 'Am', 'G', 'C', 'Bb'],
  8900,
  '[
    {
      "label": "Куплет 1",
      "lines": [
        {"chords": ["Dm", "", "", "Am", ""], "lyrics": "Стріляли очі, чорні очі"},
        {"chords": ["G", "", "", "Dm", ""], "lyrics": "У саме серце вцілили"},
        {"chords": ["Bb", "", "", "C", ""], "lyrics": "І залишили без сили"},
        {"chords": ["Dm", "", "Am", ""], "lyrics": "Мене самого зовсім"}
      ]
    },
    {
      "label": "Приспів",
      "lines": [
        {"chords": ["Dm", "", "C", "", ""], "lyrics": "Ти — моя загибель"},
        {"chords": ["Bb", "", "G", "", ""], "lyrics": "Ти — моя любов"},
        {"chords": ["Dm", "", "C", "", ""], "lyrics": "Без тебе холодно і зимно"},
        {"chords": ["Bb", "C", "Dm", ""], "lyrics": "Навіть серед слів"}
      ]
    }
  ]'::jsonb,
  ARRAY['D', 'D', 'Ux', 'U', 'D', 'U'],
  '/songs/strilyaly-ochi.png',
  NULL,
  'published'
);
