class NetTest
  require 'timeout'
  require 'socket'

  def self.http
    begin
      Timeout::timeout(2) do
        %x{/usr/bin/nc -z www.google.com 80; echo $?}.to_i.zero?
      end
    rescue Timeout::Error
      false
    end
  end

  def self.https
    begin
      Timeout::timeout(2) do
        %x{/usr/bin/nc -z www.google.com 443; echo $?}.to_i.zero?
      end
    rescue Timeout::Error
      false
    end
  end

end
