
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




Table finance {
  id bigint [increment, pk]
  title varchar(100)
  description longtext
  type tinyint(2) [note: "1: income, 2: outcome, 3: debt"]
  status tinyint(2) [note: "1: lunas, 2: belum lunas, 3: dicicil, 4: belum di terima, 5: sudah diterima"]
  created_at bigint
  updated_at bigint
}
