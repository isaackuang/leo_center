(function() {
  Ext.define('LeoTamer.model.Nodes', {
    extend: 'Ext.data.Model',
    fields: ["type", "node", "status", "ring_hash_current", "ring_hash_previous", "joined_at"]
  });

  Ext.define("LeoTamer.Nodes", {
    extend: "Ext.panel.Panel",

    title: "Node Status",
    id: "nodes_panel",
    layout: "border",
    
    command_store: Ext.create("Ext.data.Store", {
      fields: [ "command" ],
      data: [
        { command: "none" },
        { command: "resume" },
        { command: "suspend" },
        { command: "detach" }
      ]
    }),

    command_combo: Ext.create("Ext.form.ComboBox", {
        store: this.command_store,
        labelWidth: 125,
        fieldLabel: "Execute Command",
        displayField: "command",
        valueField: "command",
        emptyText: "Select Command",
        allowBlank: false,
        editable: false
    }),

    detail_store: Ext.create("Ext.data.ArrayStore", {
      model: "LeoTamer.model.NameValue",
      proxy: {
        type: 'ajax',
        url: 'nodes/detail.json',
        reader: {
          type: 'json',
          root: 'data'
        },
        // disabe unused params
        noCache: false,
        limitParam: undefined,
        pageParam: undefined,
        sortParam: undefined,
        startParam: undefined,
        listeners: {
          exception: function(self, response, operation) {
            alert("Error on: \'" + self.url + "\'\n" + response.responseText);
          }
        }
      }
    }),
    
    do_send_command: function(node, command) {
      Ext.Ajax.request({
        url: "nodes/exec.json",
        method: "POST",
        params: {
          node: node,
          command: command
        },
        success: function(response) {
          //TODO
        },
        failure: function(response, opts) {
          //TODO
        }
      })
    },

    confirm_send_command: function(node, command) {
      Ext.Msg.on("beforeshow",  function (win) {
        win.defaultFocus = 2; // set default focus to "No" button
      });

      msg = "Are you sure to send command '" + command + " " + node + "'?";
      Ext.Msg.confirm("Confirm", msg, function(btn) {
        if (btn == "yes") this.do_send_command(node, command);
      });
    },

    status_renderer: function(val) {
      var src;
      switch (val) {
        case "running":
          src = "images/accept.gif";
          break;
        case "stop":
        case "downed":
          src = "images/error.png";
          break;
        case "attached":
          src = "images/add.png";
          break;
        case "suspended":
          src = "images/warn.png";
          break;
        default:
          throw "invalid status specified.";
      }
      return "<img class='status' src='" + src + "'> " + val;
    },

    grid_grouping: Ext.create('Ext.grid.feature.Grouping', {
      groupHeaderTpl: '{name} ({rows.length} node{[values.rows.length > 1 ? "s" : ""]})',
      hideGroupedHeader: true
    }),

    on_grid_select: function(self, record) {
      name = record.data.node;
      status = record.data.status;
      self.status_panel.setTitle("status of " + name);
      name_line = "Node Name: " + record.data.node;
      status_line = "Status: " + self.status_renderer(record.data.status);
      Ext.getCmp("node_status").update(name_line + "<br>" + status_line);
      self.detail_store.load({ 
        params: { 
          node: name,
          type: record.data.type
        }
      });
    },

    initComponent: function() {
      var self = this;

      self.send_command = function() {
        var node, command_select_window;  

        node = self.grid.getSelectionModel().getSelection()[0].data;
        command_select_window = Ext.create('Ext.window.Window', {
          title: node.node,
          items: self.command_combo,
          buttons: [{
            text: "Apply",
            handler: function() {
              command = self.command_combo.getRawValue();
              if (command != "none")
                self.confirm_send_command(node.node, command);
            }
          }, {
            text: "Cancel",
            handler: function() {
              command_select_window.close();
            }
          }]
        }).show();
      };

      self.status_panel = Ext.create("Ext.Panel", {
        title: "status",
        region: "east",
        width: 300,
        resizable: false,
        items: [
          {
            xtype: "panel",
            id: "node_status",
            border: false,
            padding: "5",
            buttons: [{
              text: "Change Status",
              handler: self.send_command
            }]
          }, {
            xtype: 'grid',
            title: "defail information",
            border: false,
            forceFit: true,
            hideHeaders: true,
            columns: [
              {
                dataIndex: "name",
                text: "Name"
              }, {
                dataIndex: "value",
                text: "Value"
              }
            ],
            store: self.detail_store
          }
        ]
      });

      self.store = Ext.create("Ext.data.Store", {
        model: "LeoTamer.model.Nodes",
        groupField: 'type',
        proxy: {
          type: 'ajax',
          url: 'nodes/status.json',
          reader: {
            type: 'json',
            root: 'data'
          },
          // disable unused params
          noCache: false,
          limitParam: undefined,
          pageParam: undefined,
          sortParam: undefined,
          startParam: undefined,
          listeners: {
            load: function() {
              alert("foo");
              self.grid.getSelectionModel().selectFirstRow();
            },
            exception: function(store, response, operation) {
              alert("Error on: \'" + store.url + "\'\n" + response.responseText);
            }
          }
        }
      });

      self.grid = Ext.create("Ext.grid.Panel", {
        title: 'Nodes',
        store: self.store,
        region: "center",
        forceFit: true,
        features: [ self.grid_grouping ],
        viewConfig: {
          trackOver: false
        },
        columns: [
          {
            dataIndex: "type"
          }, {
            text: "Node",
            dataIndex: 'node',
            sortable: true
          }, {
            text: "Status",
            dataIndex: 'status',
            renderer: self.status_renderer,
            sortable: true
          }, {
            text: "Ring (Cur)",
            dataIndex: 'ring_hash_current'
          }, {
            text: "Ring (Prev)",
            dataIndex: 'ring_hash_previous'
          }, {
            text: "Joined At",
            dataIndex: "joined_at"
          }
        ],
        tbar: [
          {
            xtype: "textfield",
            fieldLabel: "<img src='images/filter.png'> Filter:",
            labelWidth: 50,
            listeners: {
              change: function(grid, new_value) {
                var store = grid.getStore();
                store.clearFilter();
                store.filter("node", new RegExp(new_value));
              }
            }
          },
          "->",
          {
            xtype: "button",
            icon: "images/reload.png",
            handler: function() {
              self.store.load();
            }
          }
        ],
        listeners: {
          render : function(grid){
            var interval = 30000;

            grid.store.on('load', function(){
              grid.getSelectionModel().select(0); // select first row
            });

            Ext.TaskManager.start({
              run: function() {
                self.store.load();
              },
              interval: interval
            });
          },
          select: function(grid, record) {
            self.on_grid_select(self, record);
          }
        }
      });

      Ext.apply(self, {
        items: [self.grid, self.status_panel]
      });

      return self.callParent(arguments);
    }
  });

}).call(this);
