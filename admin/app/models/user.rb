class User < ActiveRecord::Base
  belongs_to :domain
  has_many :administrators
  has_many :admin_for, :through => :administrators, :source => :domain
  validates_presence_of :name, :domain_id, :fullname
  validates_format_of :name, :with => /^[a-zA-Z0-9_\.\-]+$/
  validates_uniqueness_of :name, :scope => :domain_id, :case_sensitive => false
  validates_length_of :password1, :minimum => 6, :allow_blank => true
  validates_confirmation_of :password1, :allow_blank => true
  validates_numericality_of :quota, :only_integer => true, :allow_blank => true
  attr_accessor :password1, :password1_confirmation

  def before_create
    self.quota = self.domain.quota if self.domain && self.domain.quota && !self.quota
    ActiveRecord::Base.connection.execute("ALTER TABLE users AUTO_INCREMENT = 2000;") if User.count.zero?
  end

  def before_save
    self.name.downcase!
    self.email = name + "@" + domain.name
    self.home = "/var/mailserver/mail/" + self.domain.name + "/" + name + "/home"
    self.quota = self.domain.quota if self.domain && self.domain.quota && !self.quota
  end

  def password1=(password)
    @password1 = password
    self.password = @password1 unless @password1.blank?
  end

  def after_create
    %x{
      cp -r /var/mailserver/admin/config/default_maildir /var/mailserver/mail/#{domain.name}/#{name}
      chown -R #{id}:#{id} /var/mailserver/mail/#{domain.name}/#{name}
      find /var/mailserver/mail/#{domain.name}/#{name} -type f -name .gitignore | xargs rm
      find /var/mailserver/mail/#{domain.name}/#{name} -type d | xargs chmod 750
    }
  end

  def before_update
    @oldname = User.find(id).name
  end

  def after_update
    %x{mv /var/mailserver/mail/#{domain.name}/#{@oldname} /var/mailserver/mail/#{domain.name}/#{name}}
  end

  def before_destroy
    @oldname = User.find(id).name
  end

  def name_and_email
    (fullname.present? ? "#{fullname} <#{email}>" : email) rescue ""
  end

  def after_destroy
    %x{rm -rf /var/mailserver/mail/#{domain.name}/#{@oldname}}
  end

  def validate
    errors.add("quota", "exceeds domain maximum #{self.domain.quotamax} Mb") if (quota.to_i > self.domain.quotamax.to_i)
  end

  private

  def validate_on_create
    errors.add("password1", "cannot be empty") if password.blank? && password1.blank?
  end

end
