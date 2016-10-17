$(function() {
  $('#p1 a').miniPreview({ prefetch: 'pageload' });
  $('#p2 a').miniPreview({ prefetch: 'parenthover' });
  $('#p3 a').miniPreview({ prefetch: 'none' });
});

(function($) {
  var PREFIX = 'link-preview';
  
  $.fn.miniPreview = function(options) {
    return this.each(function() {
      var $this = $(this);
      var miniPreview = $this.data(PREFIX);
      if (miniPreview) {
        miniPreview.destroy();
      }

      miniPreview = new MiniPreview($this, options);
      miniPreview.generate();
      $this.data(PREFIX, miniPreview);
    });
  };
  
  var MiniPreview = function($el, options) {
    this.$el = $el;
    this.options = $.extend({}, this.defaultOptions, options);
    this.counter = MiniPreview.prototype.sharedCounter++;
  };
  
  MiniPreview.prototype = {
    sharedCounter: 0,
    
    defaultOptions: {
      width: 256,
      height: 144,
      scale: .25,
      prefetch: 'pageload'
    },
        
    generate: function() {
      this.createElements();
      this.setPrefetch();
    },

    createElements: function() {
      var $wrapper = $('<div>', { class: PREFIX + '-wrapper' });
      var $loading = $('<div>', { class: PREFIX + '-loading' });
      var $frame = $('<iframe>', { class: PREFIX + '-frame' });
      var $cover = $('<div>', { class: PREFIX + '-cover' });
      $wrapper.appendTo(this.$el).append($loading, $frame, $cover);
      
      $wrapper.css({
        width: this.options.width + 'px',
        height: this.options.height + 'px'
      });
      
      var inversePercent = 100 / this.options.scale;
      $frame.css({
        width: inversePercent + '%',
        height: inversePercent + '%',
        transform: 'scale(' + this.options.scale + ')'
      });

      var fontSize = parseInt(this.$el.css('font-size').replace('px', ''), 10)
      var top = (this.$el.height() + fontSize) / 2;
      var left = (this.$el.width() - $wrapper.outerWidth()) / 2;
      $wrapper.css({
        left: left + 'px'
      });
    },
    
    setPrefetch: function() {
      switch (this.options.prefetch) {
        case 'pageload':
          this.loadPreview();
          break;
        case 'parenthover':
          this.$el.parent().one(this.getNamespacedEvent('mouseenter'),
            this.loadPreview.bind(this));
          break;
        case 'none':
          this.$el.one(this.getNamespacedEvent('mouseenter'),
            this.loadPreview.bind(this));
          break;
        default:
          throw 'Prefetch setting not recognized: ' + this.options.prefetch;
          break;
      }
    },
    
    loadPreview: function() {
      this.$el.find('.' + PREFIX + '-frame')
        .attr('src', this.$el.attr('href'))
        .on('load', function() {
          $(this).css('background-color', '#fff');
        });
    },
    
    getNamespacedEvent: function(event) {
      return event + '.' + PREFIX + '_' + this.counter;
    },

    destroy: function() {
      this.$el.parent().off(this.getNamespacedEvent('mouseenter'));
      this.$el.off(this.getNamespacedEvent('mouseenter'));
      this.$el.find('.' + PREFIX + '-wrapper').remove();
    }
  };
})(jQuery);

function smartLink(){
    this.keywdHref = new Object();
    this.add = function(keyword, href){
        if(keyword.substr(0,1) != &quot; &quot;){keyword = &quot; &quot; + keyword;}
        this.keywdHref[keyword] =  href;
    }
    this.createAnchor = function(){
        var objs = document.getElementsByTagName(&quot;div&quot;);
        for(var i=0; i&lt;objs.length; i++){
            var obj = objs[i];
            if(obj.className.indexOf(&quot;post-body&quot;)&gt;-1){
                var content = obj.innerHTML;
                for(var keyword in this.keywdHref){
                    var href = this.keywdHref[keyword];
                    var newstr = content.replace(keyword, &quot;&lt;a href=&#39;&quot;+href+&quot;&#39; rel=&#39;nofollow&#39; target=&#39;_blank&#39; title=&#39;&quot;+keyword+&quot;&#39;&gt;&quot;+keyword+&quot;&lt;/a&gt;&quot;, &quot;gi&quot;);
                    obj.innerHTML = newstr;
                    content = newstr;
                }
            }
        }
    }
    this.startScript = function(){
        var onLoad = window.onload;
        window.onload = function(){
            if(onLoad){onLoad();}
            setTimeout(&quot;f.createAnchor()&quot;, 100);
        }
    }
}
