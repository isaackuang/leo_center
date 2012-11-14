require 'leofs_manager_client'

class LeoTamer
  configure do
    @@manager ||= LeoFSManager::Client.new(*Config[:managers])
  end

  namespace "/credentials" do
    get "/list.json" do
      #TODO
      nil
    end
  end
end
