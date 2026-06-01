INSERT INTO wedding_settings (
  id,
  couple_names,
  tagline,
  wedding_date,
  locale,
  location_name,
  location_summary,
  hero_image_url,
  theme
) VALUES (
  1,
  'Pim & Kelly',
  'Een weekend samen in het zuiden',
  '2026-09-12',
  'nl',
  'Hoeve de Demo',
  'Een warme plek tussen dorp, wijngaard en binnenplaats.',
  '/images/venue/chateau-1.jpg',
  '{"background":"#FAF8F5","surface":"#FFFFFF","ink":"#5C4A35","muted":"#8B7355","accent":"#EDE8DD","accentStrong":"#C4A35A"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  couple_names = excluded.couple_names,
  tagline = excluded.tagline,
  wedding_date = excluded.wedding_date,
  locale = excluded.locale,
  location_name = excluded.location_name,
  location_summary = excluded.location_summary,
  hero_image_url = excluded.hero_image_url,
  theme = excluded.theme,
  updated_at = now();

INSERT INTO content_sections (id, slug, title, body, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000101', 'welcome', 'Welkom', 'We vieren graag een heel weekend samen. Op deze site vind je het programma, praktische informatie, RSVP, menu-keuzes en carpooling.', 1),
  ('00000000-0000-0000-0000-000000000102', 'venue', 'Locatie', 'De ceremonie, borrel en avond vinden op dezelfde locatie plaats. Parkeren kan op het terrein; kom je met het OV, laat het weten via carpooling.', 2),
  ('00000000-0000-0000-0000-000000000103', 'practical', 'Praktisch', 'Neem iets warms mee voor later op de avond. Dresscode: feestelijk, comfortabel en klaar voor een lange dag buiten en binnen.', 3)
ON CONFLICT (slug) DO UPDATE SET title = excluded.title, body = excluded.body, sort_order = excluded.sort_order;

INSERT INTO schedule_days (id, label, event_date, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000201', 'Vrijdag', '2026-09-11', 1),
  ('00000000-0000-0000-0000-000000000202', 'Zaterdag', '2026-09-12', 2)
ON CONFLICT (id) DO UPDATE SET label = excluded.label, event_date = excluded.event_date, sort_order = excluded.sort_order;

INSERT INTO schedule_events (id, day_id, event_time, title, description, location, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', '11:00', 'Dorpsmarkt', 'Optioneel rondje over de markt voor wie al in de buurt is.', 'Dorp', 1),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000201', '15:00', 'Wijnproeverij', 'Laat ons weten of je mee wilt, dan regelen we de juiste groepsgrootte.', 'Wijngaard', 2),
  ('00000000-0000-0000-0000-000000000221', '00000000-0000-0000-0000-000000000202', '14:00', 'Ceremonie', 'We starten samen met de ceremonie.', 'Binnenplaats', 1),
  ('00000000-0000-0000-0000-000000000222', '00000000-0000-0000-0000-000000000202', '18:30', 'Diner', 'Een gedeeld diner met persoonlijke menu-keuzes.', 'Schuur', 2),
  ('00000000-0000-0000-0000-000000000223', '00000000-0000-0000-0000-000000000202', '21:00', 'Feest', 'Dansen, taart en late avondmuziek.', 'Feestzaal', 3)
ON CONFLICT (id) DO UPDATE SET day_id = excluded.day_id, event_time = excluded.event_time, title = excluded.title, description = excluded.description, location = excluded.location, sort_order = excluded.sort_order;

INSERT INTO faqs (id, question, answer, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000301', 'Kan ik iemand meenemen?', 'Als er een plus-one voor je huishouden is toegevoegd, zie je die op je RSVP-pagina.', 1),
  ('00000000-0000-0000-0000-000000000302', 'Wanneer moeten menu-keuzes binnen zijn?', 'Graag zo snel mogelijk, zodat we dit op tijd met de cateraar kunnen afstemmen.', 2),
  ('00000000-0000-0000-0000-000000000303', 'Is er vervoer geregeld?', 'Gebruik carpooling om ritten aan te bieden of een plek in een auto te vinden.', 3)
ON CONFLICT (id) DO UPDATE SET question = excluded.question, answer = excluded.answer, sort_order = excluded.sort_order;

INSERT INTO menu_courses (id, label, description, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000401', 'Voorgerecht', 'Kies een voorgerecht of geef aan dat niets past.', 1),
  ('00000000-0000-0000-0000-000000000402', 'Hoofdgerecht', 'Kies een hoofdgerecht of geef aan dat niets past.', 2),
  ('00000000-0000-0000-0000-000000000403', 'Dessert', 'Kies een dessert of geef aan dat niets past.', 3)
ON CONFLICT (id) DO UPDATE SET label = excluded.label, description = excluded.description, sort_order = excluded.sort_order;

INSERT INTO menu_options (id, course_id, label, description, dietary_tags, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000411', '00000000-0000-0000-0000-000000000401', 'Seizoenssalade', 'Fris, vegetarisch en lokaal.', ARRAY['vegetarian'], 1),
  ('00000000-0000-0000-0000-000000000412', '00000000-0000-0000-0000-000000000401', 'Visgerecht', 'Licht voorgerecht met vis.', ARRAY['fish'], 2),
  ('00000000-0000-0000-0000-000000000421', '00000000-0000-0000-0000-000000000402', 'Ravioli', 'Vegetarisch hoofdgerecht.', ARRAY['vegetarian'], 1),
  ('00000000-0000-0000-0000-000000000422', '00000000-0000-0000-0000-000000000402', 'Langzaam gegaarde stoof', 'Warm hoofdgerecht met vlees.', ARRAY['meat'], 2),
  ('00000000-0000-0000-0000-000000000431', '00000000-0000-0000-0000-000000000403', 'Citroentaart', 'Fris dessert.', ARRAY['vegetarian'], 1),
  ('00000000-0000-0000-0000-000000000432', '00000000-0000-0000-0000-000000000403', 'Chocolademousse', 'Rijk dessert.', ARRAY['vegetarian'], 2)
ON CONFLICT (id) DO UPDATE SET course_id = excluded.course_id, label = excluded.label, description = excluded.description, dietary_tags = excluded.dietary_tags, sort_order = excluded.sort_order;

INSERT INTO activities (id, label, description, response_kind, options, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000501', 'Wijnproeverij vrijdag', 'Wil je vrijdagmiddag mee naar de wijnproeverij?', 'yes_no', ARRAY['yes','no','maybe'], 1)
ON CONFLICT (id) DO UPDATE SET label = excluded.label, description = excluded.description, response_kind = excluded.response_kind, options = excluded.options, sort_order = excluded.sort_order;

INSERT INTO households (id, name, email, phone, notes) VALUES
  ('00000000-0000-0000-0000-000000000601', 'Familie Demo', 'familie@example.com', null, 'Demo-huishouden voor lokale ontwikkeling'),
  ('00000000-0000-0000-0000-000000000602', 'Vrienden Demo', 'vrienden@example.com', null, 'Tweede demo-huishouden')
ON CONFLICT (id) DO UPDATE SET name = excluded.name, email = excluded.email, phone = excluded.phone, notes = excluded.notes;

INSERT INTO guests (id, household_id, first_name, last_name, rsvp_status, dietary_confirmed, dietary_notes, allergy_notes, is_child, plus_one, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000601', 'Alex', 'Demo', 'unknown', false, null, null, false, false, 1),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000601', 'Sam', 'Demo', 'unknown', false, null, null, false, false, 2),
  ('00000000-0000-0000-0000-000000000703', '00000000-0000-0000-0000-000000000602', 'Robin', 'Voorbeeld', 'unknown', false, null, null, false, false, 1)
ON CONFLICT (id) DO UPDATE SET household_id = excluded.household_id, first_name = excluded.first_name, last_name = excluded.last_name, rsvp_status = excluded.rsvp_status, dietary_confirmed = excluded.dietary_confirmed, dietary_notes = excluded.dietary_notes, allergy_notes = excluded.allergy_notes, is_child = excluded.is_child, plus_one = excluded.plus_one, sort_order = excluded.sort_order;
