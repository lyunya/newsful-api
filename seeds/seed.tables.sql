-- Demo data for local development.
-- Log in with demo@demo.com / P@ssword1
BEGIN;

INSERT INTO
    newsful_users (email, password)
VALUES
    (
        'demo@demo.com',
        '$2b$12$W9ewT6khisZ1WX8AvHvJHOBqi9BWHSXyplzHasAJrpIyTcukRZBgW'
    )
ON CONFLICT DO NOTHING;

INSERT INTO
    newsful_saved_articles (title, url, image, user_id)
VALUES
    (
        'Doctor reinfected with COVID-19 — three months after recovering',
        'https://www.foxnews.com/health/doctor-reinfected-covid-19-three-months-after-recovering',
        NULL,
        (SELECT id FROM newsful_users WHERE email = 'demo@demo.com')
    ),
    (
        'Trump will not send federal troops to New York City: Cuomo',
        'https://www.reuters.com/article/us-global-race-new-york-idUSKCN24O2GM',
        NULL,
        (SELECT id FROM newsful_users WHERE email = 'demo@demo.com')
    ),
    (
        'Rep. Blumenauer: Feds unwanted, unprepared, unwelcome in Portland',
        'https://www.msnbc.com/hallie-jackson/watch/rep-blumenauer-feds-unwanted-unprepared-unwelcome-in-portland-88181829515',
        NULL,
        (SELECT id FROM newsful_users WHERE email = 'demo@demo.com')
    )
ON CONFLICT DO NOTHING;

COMMIT;
