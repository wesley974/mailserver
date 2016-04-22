ActiveRecord::Schema.define(:version => 20101216072412) do

  create_table "administrators", :force => true do |t|
    t.integer  "domain_id"
    t.integer  "user_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "admins", :force => true do |t|
    t.string   "username",   :limit => 32,  :default => "", :null => false
    t.string   "password",   :limit => 32,  :default => "", :null => false
    t.string   "email",      :limit => 128
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "admins", ["username"], :name => "admins_uniq", :unique => true

  create_table "domains", :force => true do |t|
    t.string   "name",       :limit => 128
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "quota"
    t.integer  "quotamax"
  end

  add_index "domains", ["name"], :name => "domain_uniq", :unique => true

  create_table "forwardings", :force => true do |t|
    t.integer  "domain_id",                  :default => 0,  :null => false
    t.string   "source",      :limit => 128, :default => "", :null => false
    t.text     "destination",                                :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "routings", :force => true do |t|
    t.string "destination", :limit => 128
    t.string "transport",   :limit => 128
  end

  create_table "sessions", :force => true do |t|
    t.string   "session_id", :null => false
    t.text     "data"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "sessions", ["session_id"], :name => "index_sessions_on_session_id"
  add_index "sessions", ["updated_at"], :name => "index_sessions_on_updated_at"

  create_table "userpref", :primary_key => "prefid", :force => true do |t|
    t.string "username",   :limit => 100, :default => "", :null => false
    t.string "preference", :limit => 50,  :default => "", :null => false
    t.string "value",      :limit => 100, :default => "", :null => false
  end

  add_index "userpref", ["username"], :name => "username"

  create_table "users", :force => true do |t|
    t.integer  "domain_id"
    t.string   "email",      :limit => 128, :default => "", :null => false
    t.string   "name",       :limit => 128
    t.string   "fullname",   :limit => 128
    t.string   "password",   :limit => 32,  :default => "", :null => false
    t.string   "home",                      :default => "", :null => false
    t.integer  "priority",                  :default => 7,  :null => false
    t.integer  "policy_id",                 :default => 1,  :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "quota"
  end

end
