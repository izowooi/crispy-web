# 데이터베이스 구조 (DB Schema)

## Users

  field        type
  ------------ -----------
  id           uuid
  username     string
  email        string
  created_at   timestamp

------------------------------------------------------------------------

## Recipes

  field        type
  ------------ -----------
  id           uuid
  title        string
  video_url    string
  thumbnail    string
  creator_id   uuid
  created_at   timestamp
  views        int
  likes        int

------------------------------------------------------------------------

## Ingredients

  field       type
  ----------- --------
  id          uuid
  recipe_id   uuid
  name        string
  quantity    string

------------------------------------------------------------------------

## Steps

  field         type
  ------------- ------
  id            uuid
  recipe_id     uuid
  step_number   int
  description   text

------------------------------------------------------------------------

## Tags

  field   type
  ------- --------
  id      uuid
  name    string

------------------------------------------------------------------------

## Recipe_Tags

  field       type
  ----------- ------
  recipe_id   uuid
  tag_id      uuid
