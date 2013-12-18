$(document).ready(function() {

	var message = {
		"format" : "Must select a file to upload",
		"existing" : "File already exists in the system since %s. Redirecting...",
		"added" : "File successfully added to system. Redirecting..."
	}
	
	var bar = $('.bar');
	var upload_submit = $("#upload_submit");
	var upload_form = $('#upload_form');
	var latest = $('#latest');
	var latest_confirmed = $('#latest_confirmed');
	var explain = $('#explain');
	var dropbox = $('.dropbox');

	// uncomment this to try non-HTML support:
	//window.File = window.FileReader = window.FileList = window.Blob = null;
	
	var html5 = window.File && window.FileReader && window.FileList && window.Blob; 
	if (!html5) {
		explain.html("<strong>Important: </strong>Your browser does not support HTML5, so your document will need to be uploaded." +
				" The cryptographic digest will be calculated on our servers but the document will be" +
				" discarded immediately, without being stored, logged, or otherwise accessed. " +
				"Please contact us if you have any questions.");
		upload_submit.show();
		dropbox.hide();
	} else {
		dropbox.filedrop({
		    callback : handleFileSelect
		});
		dropbox.click(function() {
			$("#file").click();
		});
	    $('#file').change(function(){
	        
	    })
		
	}

	// latest documents
	var refreshLatest = function(confirmed, table) {
		$.getJSON('/api/document/latest?confirmed='+confirmed, function(data) {
			var items = [];

			items.push('<thead><tr><th></th><th>Document Digest</th><th>Timestamp</th></tr></thead>');
			$.each(data, function(index, obj) {
				badge = "";
				if (obj.tx) {
					badge = '<span class="label label-success">✔</span>';
				}
				items.push('<tr><td>'+badge+'</td><td><a href="/detail/' + obj.digest+'">'+obj.digest +
						'</a></td><td> ' + obj.timestamp + '</td></tr>');
			});

			table.empty();
			$('<div/>', {
				'class' : 'unstyled',
				html : items.join('<br />')
			}).appendTo(table);
		});
	}
	refreshLatest("false", latest);
	refreshLatest("true", latest_confirmed);

	// client-side hash
	var onRegisterSuccess = function(json) {
		if (json.success) {
			show_message(vsprintf(message["added"], []), "success");
		} else {
			if (json.args) {
				show_message(vsprintf(message[json.reason], json.args), "success");
			} else {
				show_message(message[json.reason], "error");
			}
			
		}
		if (json.digest) {
			window.setTimeout(function() {
				window.location.replace("/detail/"+json.digest);
			}, 5000);
		}
	}
	
	var crypto_callback = function(p) {
		var w = ((p*100).toFixed(0));
		bar.width( w+"%");
		explain.html("Now hashing... "+(w)+"%");
	}
	
	var crypto_finish = function(hash) {
		bar.width(100 + "%");
		explain.html("Document hash: "+hash);
		$.getJSON('/api/document/register?d='+hash, onRegisterSuccess);
	}
	
	function handleFileSelect(f) {
		if (!html5) {
			return;
		}
		explain.html("Loading document...");
	    var output = "";
	    output = '' + escape(f.name)
			+ ' (' + (f.type || 'n/a') + ') - '
			+ f.size + ' bytes, last modified: '
			+ (f.lastModifiedDate ? f.lastModifiedDate
					.toLocaleDateString() : 'n/a' )+ '';
	    
	    var reader = new FileReader();
		reader.onload = function(e) {
			var data = e.target.result;
			bar.width(0+"%");
			bar.addClass('bar-success');
			explain.html("Now hashing... Initializing");
			setTimeout(function() {
				CryptoJS.SHA256(data,crypto_callback,crypto_finish);
			}, 200);
			
		};
		reader.onprogress = function(evt) {
		    if (evt.lengthComputable) {
		    	var w = (((evt.loaded / evt.total)*100).toFixed(2));
				bar.width( w+"%");
		    }
		}
		reader.readAsBinaryString(f);
		show_message(output);
	}
	
	document.getElementById('file').addEventListener('change', function(evt) {
		var f = evt.target.files[0];
		handleFileSelect(f);
	}, false);

	// upload form (for non-html5 clients)
	upload_submit.click(function(event) {
		upload_form.ajaxForm({
			dataType : 'json',
			beforeSubmit : function() {
				var percentVal = '0%';
				bar.removeClass('bar-danger');
				bar.removeClass('bar-warning');
				bar.removeClass('bar-success');
				bar.addClass('bar-info');
				bar.width(percentVal)
			},
			uploadProgress : function(event, position, total, percentComplete) {
				var percentVal = percentComplete + '%';
				bar.width(percentVal)
			},
			success : onRegisterSuccess
		});

	});
});