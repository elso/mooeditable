/*
---

name: MooEditable.UI.Statusbar

description: Draw Statusbar with character and/or word counter.

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
					'resizeable' : true,
					'resizedirection' : {x: true, y: true},
					'separator' : ' / ',
					'class' : ''
				},
				
        attach: function () {
	          this.previous();
	          this.setOptions(this.options);
	          this.drawStatusbar();
	          return this;
        },
        
        drawStatusbar: function(){
        		var self = this;
		      	this.statusbar = new Element('div', {'class': 'mooeditable-ui-statusbar ' + this.options['class']});
		      	if ((this.options.showwords) || (this.options.showchars)) {
		      		this.wordcounter = new Element('div', {'class': 'mooeditable-ui-statusbar-wordcount'});
		      		this.updateCount();
		      		this.doc.body.addEvent('keyup', this.updateCount.bind(this));		      		
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
										this.fireEvent('editorResize', [e, self]);
									},
									onDrag: function(el){
										if(self.options.resizedirection.x == true)
											self.container.setStyle('width', el.getSize().x);
									},
									onComplete: function(){
										mooeditableiframesaver.destroy();
									}
								});
							document.id(this.resizer).inject(this.statusbar);
						}
						document.id(this.statusbar).inject(this.container, 'bottom');						
        },
        
        updateCount: function(){
        		var text = this.getContent().stripTags();
        		var numChars = text.length;
						var numWords = (numChars != 0) ? text.split(' ').length : 0;
						if ((this.options.showwords) && (this.options.showchars)) {			
							var insertText = MooEditable.Locale.get('words') + ': ' + numWords + this.options.separator + MooEditable.Locale.get('chars') + ': ' + numChars;
						} 
						else {
							var insertText = (this.options.showwords) ? MooEditable.Locale.get('words') + ': ' + numWords : (this.options.showchars) ? MooEditable.Locale.get('chars') + ': ' + numChars : '';
						} 
						this.wordcounter.set('text', insertText);
        }
    });
}());