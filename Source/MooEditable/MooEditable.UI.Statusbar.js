/*
---

name: MooEditable.UI.Statusbar

description: Draw Statusbar with character and/or word counter / show html path word and character/word limit.

license: MIT-style license

author:
- René Grosseck <elso@p-link.de>

requires:
- MooEditable
- More/String.Extras
- More/Class.Refactor
- More/Class.Mask
- More/Drag

usage:
  Add the following tags in your html
  <link rel="stylesheet" href="MooEditable.css">
  <script src="mootools.js"></script>
  <script src="MooEditable.js"></script>
  <script src="MooEditable.UI.Statusbar.js"></script>

  <script>
  window.addEvent('domready', function (){
    var mooeditable = $('textarea-1').mooEditable();
  });
  </script>

provides: [MooEditable.UI.Statusbar]

version:
	1.0.0 - First release
...
*/

(function () {
    
		MooEditable.Locale.define({
			  words : 'Words',
				chars : 'Characters'
		});
    
    MooEditable = Class.refactor(MooEditable, {
				
				options: {
					'showwords' : true,
					'showchars' : true,
					'shownode' : true,
					'maxwords': null,	//Html view word limit
					'maxchars': null,	//Html view character limit
					'maxrealchars': null,	//Code view character limit
					'resizeable' : true,
					'resizedirection' : {x: false, y: true},
					'separator' : ' / ',
					'class' : ''
				},
				
				statusbar: null,
				nodepath: null,
				resizer: null,
				wordcounter: null,
				
        attach: function () {
	          this.previous();
	          this.setOptions(this.options);
	          this.drawStatusbar();
	          return this;
        },
        
        drawStatusbar: function(){
        		var self = this;
		      	this.statusbar = new Element('div', {'class': 'mooeditable-ui-statusbar ' + this.options['class']});
		      	
		      	if(this.options.shownode){
	      			this.nodepath = new Element('div', {'class': 'mooeditable-ui-statusbar-nodepath' + this.options['class']});
	      			document.id(this.nodepath).inject(this.statusbar);
	      		}
		      	
		      	if ((this.options.showwords) || (this.options.showchars)) {
							this.wordcounter = new Element('div', {'class': 'mooeditable-ui-statusbar-wordcount' + this.options['class']});
							this.updateCount();
							this.doc.body.addEvent('keydown', this.updateCount.bind(this));
							this.doc.body.addEvent('keyup', this.updateCount.bind(this));		      		
							this.textarea.addEvent('keydown', this.updateCount.bind(this));
							this.textarea.addEvent('keyup', this.updateCount.bind(this));
							document.id(this.wordcounter).inject(this.statusbar);
		      	}
						
						if(this.options.resizeable && (this.options.resizedirection.x || this.options.resizedirection.y)){
							this.resizer = new Element('div', {'class': 'mooeditable-ui-statusbar-resize'});
							var min_width = this.options.dimensions ? Math.max(this.options.dimensions.x, 100) : 100;
							var min_height = this.options.dimensions ? Math.max(this.options.dimensions.y, 100) : 100;
							var xlimit = {};
							var mcursor = '';
							
							if(this.options.resizedirection.y == true){
								Object.append(xlimit, {y: [min_height, 0xFFFF]});
								mcursor+='s';
							}
							if(this.options.resizedirection.x == true){
								Object.append(xlimit, {x: [min_width, 0xFFFF]});
								mcursor+='e';
							}
							this.resizer.setStyle('cursor', mcursor+'-resize');
							
							this.iframe.makeResizable({
									handle: this.resizer,
									limit: xlimit,
									modifiers: {x: this.options.resizedirection.x == true ? 'width' : false, y: this.options.resizedirection.y == true ? 'height' : false},
									snap: 0,
									preventDefault: true,
									onBeforeStart: function(e){
										mooeditableiframesaver = new Mask(document.body,{
											style: {
												'z-index': 2147483647,
												opacity: 0,
												cursor: mcursor+'-resize'
											}
										}).show();
										mooeditableiframesaver.show();
										this.fireEvent('editorResizeStart', [e, self]);
									},
									onDrag: function(el){
										self.textarea.setStyle('width', el.getDimensions().x);
										self.textarea.setStyle('height', el.getDimensions().y);
										
										if(self.options.resizedirection.x == true)
											self.container.setStyle('width', el.getSize().x);
										
										this.fireEvent('editorResize', [el, self]);
									},
									onComplete: function(e){
										mooeditableiframesaver.destroy();
										this.fireEvent('editorResizeEnd', [e, self]);
									}
								});
						
							document.id(this.resizer).inject(this.statusbar);
						}
						document.id(this.statusbar).inject(this.container, 'bottom');						
        },
        
        updateCount: function(e){
        	
        	if ((!this.options.showwords) || (!this.options.showchars))
        		return;
        	
					var text = this.mode == 'iframe' ? this.htmlspecialchars_decode(this.getContent().stripTags()) : this.textarea.get('value');
					text = text.replace(/(^\s*)|(\s*$)/gi,"").replace(/[ ]{2,}/gi," ").replace(/\n /,"\n");
					var numChars = text.length;
					var realChars = this.getContent().length;
					var numWords = (numChars != 0) ? text.split(' ').length : 0;
					
					if(e && e.key != 'delete' && e.key != 'backspace'){
						if(this.options.maxwords && numWords > this.options.maxwords)
							return false;
						if(this.options.maxchars && numChars >= this.options.maxchars)
							return false;
						if(this.options.maxrealchars && realChars >= this.options.maxrealchars)
							return false;
					}
					
					if ((this.options.showwords) && (this.options.showchars)) {			
						var insertText = (this.mode == 'iframe' ? MooEditable.Locale.get('words') + ': ' + numWords  + this.options.separator : '') + MooEditable.Locale.get('chars') + ': ' + numChars;
					} 
					else {
						var insertText = (this.options.showwords && this.mode == 'iframe') ? MooEditable.Locale.get('words') + ': ' + numWords : (this.options.showchars) ? MooEditable.Locale.get('chars') + ': ' + numChars : '';
					} 
					this.wordcounter.set('text', insertText);
					
        },
        
        //Clean Elements like &nbsp; for right counting
        htmlspecialchars_decode: function(text){
					var stub_object = new Element('span',{ 'html':text });
					var ret_val = stub_object.get('text');
					delete stub_object;
					return ret_val;
				},
				
				editorClick: function(){
					this.previous();
					this.updateNodePath();
				},
				
				action: function(command, args){
					this.previous(command, args);
					this.updateCount();
					this.updateNodePath();
				},
				
				updateNodePath: function(command){
					
					if ((!this.options.shownode))
        		return;

        	this.nodepath.empty();
        						
					var elements = [];
					var el = this.selection.getNode();
					if(!el) return;
					if(typeOf(el) != 'element') return;
									
					if(el.nodeName.toLowerCase() != 'html' && el.nodeName.toLowerCase() != 'body'){
						elements.include(el);
						do {
							if(el && el.nodeName.toLowerCase() != 'html' && el.nodeName.toLowerCase() != 'body')
								elements.include(el);
						}
						while ((el = Element.getParent(el)) != null);
					}

					if(this.mode == 'iframe'){
						var l = elements.length;
						elements.reverse().each(function(elp, i){							
							var iel = new Element('span',{
								'text':elp.nodeName.toLowerCase(),
								'class': 'node'
							});
							iel.addEvent('click', function(e){
										var newnode = this.selection.selectNode(elp, true);
							}.bind(this));
							iel.inject(this.nodepath);
							if(i < (l-1)){
								var iel = new Element('span',{'text':' » '});
								document.id(iel).inject(this.nodepath);	
							}
						}, this);
					}
        },
 
        checkStates: function(){
						this.previous();
						this.updateNodePath();
        }
    });
}());