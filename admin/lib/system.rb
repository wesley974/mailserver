class System
  attr_reader :os_version, :version, :cpu_type, :memory, :needs_update

  def initialize
    @os_version       = %x{uname -sr}.strip
    @cpu_type         = %x{machine}.strip
    @memory           = %x{sysctl hw.usermem | sed 's/=/ /' | awk '{print $2}'}.to_i / 1048576 + 1
  end

  def hostname
    %x{hostname}.strip
  end

  def uptime
    uptime = %x{uptime}
    if uptime =~ /up\s+([\d:]+),/
      return $1
    elsif uptime =~ /up\s+([\d]+\s+[a-z]+),/
      return $1
    end
  end

  def disk_utilization
    output = Array.new
    %x{df -h}.split("\n").each_with_index do |line, index|
      next if index == 0
      filesystem, size, used, avail, capacity, mounted_on = line.split
      output << {
        :filesystem => filesystem,
        :size => size,
        :used => used,
        :avail => avail,
        :capacity => capacity,
        :mounted_on => mounted_on
      }
    end
    output
  end

  #
  # System Commands
  #

  def reboot
    Sudo.exec("reboot")
  end

  def shutdown
    Sudo.exec("halt -p")
  end
  
end
