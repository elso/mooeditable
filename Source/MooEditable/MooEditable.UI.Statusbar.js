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
    var mooeditable = new mooEditable('textarea-1', {options});
  });
  </script>

provides: [MooEditable.UI.Statusbar]

version:
	1.0.0 	- First release
	1.0.1 	- fix some bugs counting words with limit
			- add new options (showmaxwords,showmaxchars,etc) to show maxwords and/or maxchars
			- add translation into Locale files
			- optimize MooEditable.css padding
...
 */

(function () {

	MooEditable.Locale.define({
		words : 'Words',
		chars : 'Characters',
		maxof : 'of'
	});

	MooEditable = Class.refactor(MooEditable, {

		options: {
			/*
			 onEditorResizeBeforeStart : function(){},
			 onEditorResizeDrag : function(){},
			 onEditorResizeComplete : function(){}
			 */
			'showwords' : true,			//show count of words
			'showchars' : true,			//show count of chars
			'shownode' : true,			//show html nodes
			'showmaxwords' : true,		//show word limit if set by maxwords
			'showmaxchars' : true,		//show chars limit if set by maxchars or maxrealchar
			'maxwords': null,			//word limit into Html View
			'maxchars': null,			//character limit into Html View (only text)
			'maxrealchars': null,		//character limit into Code View (text + html-tags)
			'resizeable' : true,		//Editor resizable
			'resizedirection' : {x: false, y: true},	//Editor resizable directions
			'separator' : '/',		//seperator between word and character
			'class' : '',
			baseCSS: 'html{ height: 100%; cursor: text; margin: 0; padding: 0;} body{ font-family: sans-serif; margin: 0 16px;}'
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
				var min_width = this.options.dimensions ? Math.max(this.options.dimensions.x, 100) : 100,
					min_height = this.options.dimensions ? Math.max(this.options.dimensions.y, 100) : 100,
					xlimit = {},
					mcursor = '';

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
						this.fireEvent('editorResizeBeforeStart', [e, this]);
					}.bind(this),
					onDrag: function(el){
						self.textarea.setStyle('width', el.getDimensions().x);
						self.textarea.setStyle('height', el.getDimensions().y);

						if(self.options.resizedirection.x == true)
							self.container.setStyle('width', el.getSize().x);

						this.fireEvent('editorResizeDrag', [el, this]);

					}.bind(this),
					onComplete: function(e){
						mooeditableiframesaver.destroy();
						this.fireEvent('editorResizeComplete', [e, this]);
					}.bind(this)
				});

				document.id(this.resizer).inject(this.statusbar);
			}
			document.id(this.statusbar).inject(this.container, 'bottom');
			return this;
		},

		updateCount: function(e){
			if (this.editorDisabled){
				e.stop();
				return;
			}

			if ((!this.options.showwords) && (!this.options.showchars))
				return;

			var text = this.mode == 'iframe' ? this.htmlspecialchars_decode(this.getContent().stripTags()) : this.textarea.get('value'),
				text_without_multi_space = text.replace(/(^\s*)|(\s*$)/gi,"").replace(/[ ]{2,}/gi," ").replace(/\n /,"\n");

			var numChars = text_without_multi_space.length,
				realChars = this.getContent().length,
				numWords = this.getWordCount(text_without_multi_space),
				statusbarText = [];

			if((this.options.showwords) && this.mode == 'iframe')
				statusbarText.push(MooEditable.Locale.get('words') + ': ' + numWords);
			if((this.options.showmaxwords) && this.mode == 'iframe' && this.options.maxwords && this.options.maxwords > 0)
				statusbarText.push(MooEditable.Locale.get('maxof') + ' ' + this.options.maxwords);
			if((this.options.showwords) && (this.options.showchars) && this.mode == 'iframe')
				statusbarText.push(this.options.separator);
			if((this.options.showchars))
				statusbarText.push(MooEditable.Locale.get('chars') + ': ' + numChars);
			if((this.options.showmaxchars) && this.mode == 'iframe' && this.options.maxchars && this.options.maxchars > 0)
				statusbarText.push(MooEditable.Locale.get('maxof') + ' ' + this.options.maxchars);
			if((this.options.showmaxchars) && this.mode != 'iframe' && this.options.maxrealchars && this.options.maxrealchars > 0)
				statusbarText.push(MooEditable.Locale.get('maxof') + ' ' + this.options.maxrealchars);

			this.wordcounter.set('text', statusbarText.join(' '));

			if(e && e.key != 'delete' && e.key != 'backspace' && (e.code < 37 || e.code > 40)){
				if(this.options.maxwords && this.options.maxwords > 0 && (numWords >= this.options.maxwords && text.substr((text.length-1), 1) == ' '))
					return false;
				if(this.options.maxchars && numChars >= this.options.maxchars)
					return false;
				if(this.options.maxrealchars && realChars >= this.options.maxrealchars)
					return false;
			}
			return this;
		},

		//Clean Elements like &nbsp; for right counting
		htmlspecialchars_decode: function(text){
			var stub_object = new Element('span',{ 'html':text }),
				ret_val = stub_object.get('text');
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

			var elements = [],
				el = this.selection.getNode();
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
		},

		getWordCount: function(text){
			var wordcount_countregex = /[\w\u2019\x27\-\u00C0-\u1FFF]+/g,
			wordcount_cleanregex = /[0-9.(),;:!?%#$?\x27\x22_+=\\/\-]*/g;

			if(text){
				text=text.replace(wordcount_cleanregex,"");
				var f=text.match(wordcount_countregex),e;
				return f&&(e=f.length) ? e : 0;
			}
			return 0;
		}
	});
}());