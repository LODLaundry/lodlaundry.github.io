var hoverDiv;
var wardrobeData = null;
var hasArchiveEntry = {};
var fromArchive = {};
var md5 = {};
var hideIcons = function() {
  hoverDiv.hide();
};

var formatInt = function(origValue) {
   var rx=  /(\d+)(\d{3})/;
      return String(origValue).replace(/^\d+/, function(w){
          while(rx.test(w)){
              w= w.replace(rx, '$1.$2');
          }
          return w;
      });
};

var downloadSelectedCleaned = function() {
  $("#wardrobeTable tr.selected .downloadClean").each(function(){
    this.click();
  });
};
var downloadSelectedDirty = function() {
  $("#wardrobeTable tr.selected .downloadDirty").each(function(){
    this.click();
  });
};

var multiButtons;
var updateMultiSelectDownloads = function(url) {
  if ($("#wardrobeTable tr.selected").length > 0) {
    if (!multiButtons.is(':visible')) {
      multiButtons.slideDown();
//      multiButtons.slideDown(400, "swing", function(){$(this).remove;});
//      multiButtons.show("slow");
    }
  } else {
//    multiButtons.hide("slow", function(){$(this).remove;});
    if (multiButtons.is(':visible')) multiButtons.slideUp();
  }
  
};

var dataTable;
var drawTable = function() {
  var table = $('<table cellpadding="0" cellspacing="0" border="0" class="display" id="wardrobeTable"></table>');
  $('#tableWrapper').html(table);
  
  if (!wardrobeData || !wardrobeData.results || !wardrobeData.results.bindings) {
    return;
  }
  
  var rows = [];
  for (var i = 0; i < wardrobeData.results.bindings.length; i++) {
    var results = wardrobeData.results.bindings[i];
    var row = [];
    row.push(results.md5.value);
    row.push(results.url.value);
    row.push(
        "<a class='downloadClean btn btn-default' title='Download the washed and cleaned data' target='_blank'><span class='glyphicon glyphicon-download'></span> Clean</a>" +
        "<a class='downloadDirty btn btn-default' title='Download original dirty dataset' href='" + results.url.value + "' target='_blank'><span class='glyphicon glyphicon-download'></span> Dirty</a>"
    );
    row.push(results.triples ? results.triples.value : 0);
    row.push("<button type='button' class='showDatasetInfo btn btn-default' title='Show more info'><span class='glyphicon glyphicon-info-sign'></span></button>");
    rows.push(row);
  }
  
  var dTableConfig = {
      "autoWidth": "false",
      "columnDefs":
        [
          {
            "celltype": "td",
            "targets": "_all"
          },
          {
            "className": "columnMd5",
            //"name": "md5",
            "orderable": false,
            "searchable": false,
            "targets": [0],
            "title": "MD5",
            //"type": "string",
            "visible": false
          },
          {
            "className": "columnUrl",
            //"name": "url",
            "orderable": true,
            "searchable": true,
            "targets": [1],
            "title": "URL",
            //"type": "string",
            "visible": true
          },
          {
            "className": "columnDownload",
            //"name": "download",
            "orderable": false,
            "searchable": false,
            "targets": [2],
            "title": "Download",
            //"type": "html",
            "visible": true
          },
          {
            "className": "columnTriples",
            //"name": "triples",
            "orderable": true,
            "searchable": false,
            "targets": [3],
            "title": "Triples",
            //"type": "numeric",
            "visible": true
          },
          {
            "className": "columnMetadata",
            //"name": "metadata",
            "orderable": false,
            "searchable": false,
            "targets": [4],
            "title": "Metadata",
            //"type": "html",
            "visible": true
          }
        ],
      "createdRow": function (row, data, dataIndex) {
        var md5 = data[0];
        var triples = parseInt(data[3]);
        var cleanLink;
        if (triples == 0) {
          cleanLink = "javascript:void(0);";
        } else {
          cleanLink = api.wardrobe.download(md5);
        }
        $(row).find(".downloadClean").attr("href", cleanLink);
        $(row).find(".showDatasetInfo").click(
            function(){
              showMetadataBox(md5);
            }
        );
        $(row).find("a").click(
            function(event){
              event.stopPropagation();
            }
        );
        $(row).find("button").click(
            function(event){
              event.stopPropagation();
            }
        );
        $(this).toggleClass('selected');
        $(row).click(
            function(){
              $(this).toggleClass('selected');
              updateMultiSelectDownloads();
            }
        );
      },
      "data": rows,
      "deferRender": true,
      "displayStart": 0,
      "dom": "frtipS",
      "info": true,
      "language": {
        "decimal": ",",
        "loadingRecords": "Loading wardrobe contents...",
        "thousands": "."
      },
      "lengthChange": true,
      "lengthMenu": [10,25,50,75,100,250,500,1000],
      "order": [3,"desc"],
      "ordering": true,
      "paging": true,
      "processing": true,
      "scrollX": false,
      "scrollY": false,
      "searching": true,
      "stateSave": true
  };
  dataTable = table.dataTable(dTableConfig);
  
  multiButtons =  $("<div id='multiButtons' style='float:left; display:none'></div>");
  $("#wardrobeTable_wrapper").prepend(multiButtons);
  $("<button style='margin-left: 10px;' class='btn btn-primary' title='Download the selected washed and cleaned data'><span class='glyphicon glyphicon-download'></span> Download selected cleaned data</button>")
      .appendTo(multiButtons)
      .click(downloadSelectedCleaned);
  $("<button style='margin-left: 10px;' class='btn btn-primary' title='Download the selected dirty data'><span class='glyphicon glyphicon-download'></span> Download selected dirty data</button>")
      .appendTo(multiButtons)
      .click(downloadSelectedDirty);
  dataTable.on('draw.dt', function () { updateMultiSelectDownloads(); });
};


var wardrobeListingSPARQL =
"PREFIX ll: <http://lodlaundromat.org/vocab#>\n\
SELECT ?md5 ?url ?triples\n\
WHERE {\n\
  ?datadoc ll:url ?url .\n\
  ?datadoc ll:md5 ?md5 .\n\
  OPTIONAL { ?datadoc ll:triples ?triples . }\n\
}\n";

$( document ).ready(function() {
  $.ajax({
    data: {
      "default-graph-uri": sparql.mainGraph,
      query: wardrobeListingSPARQL
    },
    headers: {
      "Accept": "application/sparql-results+json,*/*;q=0.9"
    },
    success: function(data) {
      wardrobeData = data;
      drawTable();
      $("<button type='button' class='btn btn-default sparqlBtn'>SPARQL</button>")
          .css("position", "absolute")
          .css("top", "-40px")
          .css("left", "5px")
          .click(function() { window.open(getSparqlLink(query)); })
          .appendTo($("#wardrobeTable_wrapper"));
    },
    url: sparql.url
  });
});


$(window).on('resize', function () {
  dataTable.fnAdjustColumnSizing();
} );

