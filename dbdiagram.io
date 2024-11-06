Table users {
  id bigint [increment, pk]
  display_name  string(100) [not null]
  display_name_anonymous string(100) [null]
  photo string(150) [not null]
  description longtext
  email string(100) [not null]
  phone string(20) [not null]
  username string(100) [not null]
  password string(100) [not null]
  gender tinyint[2] [note: '1: men, 2: women']
  birth_of_day date [default: `now()`]
  referal_code string(5) [not null]
  coins integer [default: 0]
  status tinyint[2] [note: '0: non active, 1: active', default: 1]
  is_verified tinyint[2] [note: '0: non verified, 1: verified', default: 0]
  is_anonymous tinyint[2] [note: '0: non active anonymous, 1: active anonymous', default: 0]
  created_at bigint
  updated_at bigint
  Indexes {
    (referal_code) [name: "referal_code"]
    (username) [name: "username"]
  }
}
Table users_admin {
  id bigint [increment, pk]
  roles_id bigint [ref: > roles.id, not null]
  event_organizers_id bigint [ref: > event_organizers.id]
  users_id bigint [ref: > users.id]
  created_at bigint
  updated_at bigint
}

Table referal_users {
  id bigint [increment, pk]
  users_id bigint [ref: > users.id, not null]
  referal_users_id bigint [ref: > users.id, not null]
  created_at bigint
  updated_at bigint
}

Table followers {
  id bigint [increment, pk]
  follower_id bigint [ref: > users.id, not null]
  following_id bigint [ref: > users.id, not null]
  created_at bigint
  updated_at bigint
}

Table posts {
  id bigint [increment, pk]
  caption_post string[150]
  file string[255]
  users_id bigint [ref: > users.id, not null]
  created_at bigint
  updated_at bigint
}

Table post_likes {
  id bigint [increment, pk]
  users_id bigint [ref: > users.id, not null]
  posts_id bigint [ref: > posts.id, not null]
  created_at bigint
  updated_at bigint
}
Table post_comments {
  id bigint [increment, pk]
  comment_posts longtext
  users_id bigint [ref: > users.id, not null]
  posts_id bigint [ref: > posts.id, not null]
  created_at bigint
  updated_at bigint
}

Table type_content_details {
  id bigint [increment, pk]
  title string(100) [not null]
  created_at bigint
  updated_at bigint
}

Table content_details {
  id bigint [increment, pk]
  title string(100) [not null]
  schedule_start bigint
  schedule_end bigint
  date_start bigint
  date_end bigint
  description longtext
  image string(200)
  vanues_id bigint [ref: > vanues.id, not null]
  contents_id bigint [ref: > contents.id, not null]
  event_organizers_id bigint [ref: > event_organizers.id, not null]
  is_trending tinyint(2) [note: "0: no trending, 1: yes trending"]
  status tinyint(2) [note: "0: ended, 1: ongoing, 2: upcomming"]
  type_content_details_id bigint [ref: > type_content_details.id, not null]
  created_at bigint
  updated_at bigint
}

Table content_detail_tags {
  id bigint [increment, pk]
  content_details_id bigint [ref: > content_details.id]
  tags_id bigint [ref: > tags.id]
  created_at bigint
  updated_at bigint
}
Table content_detail_actress {
  id bigint [increment, pk]
  content_details_id bigint [ref: > content_details.id]
  actress_id bigint [ref: > actress.id]
  created_at bigint
  updated_at bigint
}

Table groups {
  id bigint [increment, pk]
  title string(100)
  users_id bigint [ref: > users.id]
  description longtext
  citys_id bigint [ref: > citys.id, not null]
  gender tinyint[2] [note: '1: men, 2: women, 3: all']
  content_details_id bigint [ref: > content_details.id]
  is_anonymous tinyint[2] [note: '0: non active anonymous, 1: active anonymous', default: 0]
  is_private tinyint(2) [note: "0: no private, 1: yes private"]
  status tinyinteger(2) [note: "0. non active/closed, 1. active/opened"]
  created_at bigint
  updated_at bigint
}
Table group_members {
  id bigint [increment, pk]
  groups_id bigint [ref: > groups.id]
  users_id bigint [ref: > users.id]
  status tinyinteger(2) [note: "1: joined, 2: need approval, 3: blocked", default: 1]
  created_at bigint
  updated_at bigint
}
Table group_posts {
  id bigint [increment, pk]
  caption_post longtext
  file string[255]
  groups_id bigint [ref: > groups.id]
  users_id bigint [ref: > users.id]
  created_at bigint
  updated_at bigint
}
Table group_post_likes {
  id bigint [increment, pk]
  group_posts_id bigint [ref: > group_posts.id]
  users_id bigint [ref: > users.id]
  created_at bigint
  updated_at bigint
}
Table group_post_comments {
  id bigint [increment, pk]
  comment_posts longtext
  group_posts_id bigint [ref: > group_posts.id]
  users_id bigint [ref: > users.id]
  created_at bigint
  updated_at bigint
}

Table countries {
  id bigint [increment, pk]
  title string(100) [not null]
  created_at bigint
  updated_at bigint
}
Table provinces {
  id bigint [increment, pk]
  countries_id bigint [ref: > countries.id]
  title string(100) [not null]
  created_at bigint
  updated_at bigint
}

Table citys {
  id bigint [increment, pk]
  countries_id bigint [ref: > countries.id]
  provinces_id bigint [ref: > provinces.id]
  title string(100) [not null]
  created_at bigint
  updated_at bigint
}

Table vanues {
  id bigint [increment, pk]
  citys_id bigint [ref: > citys.id]
  name string(100) [not null]
  created_at bigint
  updated_at bigint
}

Table content_detail_posts {
  id bigint [increment, pk]
  caption_post longtext
  file string[255]
  users_id bigint [ref: > users.id, not null]
  content_details_id bigint [ref: > content_details.id, not null]
  created_at bigint
  updated_at bigint
}

Table content_detail_post_likes {
  id bigint [increment, pk]
  users_id bigint [ref: > users.id, not null]
  content_detail_posts_id bigint [ref: > content_detail_posts.id, not null]
  created_at bigint
  updated_at bigint
}
Table content_detail_post_comments {
  id bigint [increment, pk]
  comment_posts longtext
  users_id bigint [ref: > users.id, not null]
  content_detail_posts_id bigint [ref: > content_detail_posts.id, not null]
  created_at bigint
  updated_at bigint
}

Table content_detail_followers {
  id bigint [increment, pk]
  users_id bigint [ref: > users.id, not null]
  content_details_id bigint [ref: > content_details.id, not null]
  created_at bigint
  updated_at bigint
}

Table actress {
  id bigint [increment, pk]
  name string(100) [not null]
  image string(255) [not null]
  gender tinyint[2] [note: '1: Men, 2: women']
  birth_of_day date [null]
  detail longtext [null]
  created_at bigint
  updated_at bigint
}

Table event_organizers {
  id bigint [increment, pk]
  fullname string(100) [not null]
  image string(255) [not null]
  detail text [null]
  created_at bigint
  updated_at bigint
}

Table roles {
  id bigint [increment, pk]
  roles_name varchar(100) [not null, note: "0: user biasa, 1. user admin, 2. user eo"]
  created_at bigint
  updated_at bigint
}

Table permissions {
  id bigint [increment, pk]
  permissions_name varchar(100) [not null]
  created_at bigint
  updated_at bigint
}

Table roles_permissions {
  id bigint [increment, pk]
  permissions_id bigint [ref: > permissions.id]
  roles_id bigint [ref: > roles.id]
  created_at bigint
  updated_at bigint
}
Table tags {
  id bigint [increment, pk]
  title string(100) [not null]
  created_at bigint
  updated_at bigint
}

Table blogs {
  id bigint [increment, pk]
  title string(100)
  slug string(100)
  description longtext
  publisers_id bigint [ref: > users.id]
  created_at bigint
  updated_at bigint
}

Table blog_tags {
  id bigint [increment, pk]
  blogs_id bigint [ref: > blogs.id]
  tags_id bigint [ref: > tags.id]
  created_at bigint
  updated_at bigint
}

Table missions {
  id bigint [increment, pk]
  title string(100)
  coins integer
  quota integer
  users_id bigint [ref: > users.id]
  status tinyint[2] [note: '0: non active, 1: active', default: 1]
  end_date bigint
  created_at bigint
  updated_at bigint
}

Table users_coin_history_redeem {
  id bigint [increment, pk]
  users_id bigint [ref: > users.id]
  coins integer
  created_at bigint
  updated_at bigint
}
Table users_get_coins {
  id bigint [increment, pk]
  users_id bigint [ref: > users.id]
  missions_id bigint [ref: > missions.id]
  coins_earned integer
  created_at bigint
  updated_at bigint
}


Table report_content_detail_posts {
  id bigint [increment, pk]
  content_detail_posts_id bigint [ref: > content_detail_posts.id]
  users_id bigint [ref: > users.id]
  description text
  created_at bigint
  updated_at bigint
}
Table report_group_posts {
  id bigint [increment, pk]
  group_posts_id bigint [ref: > group_posts.id]
  users_id bigint [ref: > users.id]
  description text
  created_at bigint
  updated_at bigint
}
Table report_groups {
  id bigint [increment, pk]
  group_posts_id bigint [ref: > group_posts.id]
  users_id bigint [ref: > users.id]
  description text
  created_at bigint
  updated_at bigint
}
Table report_users {
  id bigint [increment, pk]
  reported_users_id bigint [ref: > users.id, note: "ini yang di report"]
  users_id bigint [ref: > users.id]
  description text
  created_at bigint
  updated_at bigint
}
Table report_posts {
  id bigint [increment, pk]
  posts_id bigint [ref: > posts.id]
  users_id bigint [ref: > users.id]
  description text
  created_at bigint
  updated_at bigint
}

Table base_name_anonymous_users {
  id bigint [increment, pk]
  name varchar(100)
  type tinyint(2) [note: "1: animal, 2: fnb, 3: characteristic"]
  created_at bigint
  updated_at bigint
}

Table base_name_anonymous_user_usages {
  id bigint [increment, pk]
  name varchar(100)
  total integer
  created_at bigint
  updated_at bigint
}

Table finance {
  id bigint [increment, pk]
  title varchar(100)
  description longtext
  type tinyint(2) [note: "1: income, 2: outcome, 3: debt"]
  status tinyint(2) [note: "1: lunas, 2: belum lunas, 3: dicicil, 4: belum di terima, 5: sudah diterima"]
  created_at bigint
  updated_at bigint
}
