class GettingStartedController < ApplicationController
  layout "not_logged_in"
  before_filter :authorize
  skip_before_filter :authenticate

  def index
    redirect_to :action => "step1"
  end

  def step1 # Admin User
    @admin = Admin.new
    if request.post?
      @admin = Admin.new
      @admin.attributes = params[:admin]
      if @admin.save
        flash[:notice] = "Getting Started finished Successfully. You can now login to the appliance."
        redirect_to root_url
      end
    end
  end

  private

  def authorize
    unless Admin.count.zero? || Rails.env == "development"
      flash[:error] = "Getting Started can only run if no admins has been configured"
      redirect_to root_url
    end
  end

end
