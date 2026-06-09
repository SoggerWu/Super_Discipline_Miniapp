Component({
  properties: {
    value: {
      type: Number,
      value: 0,
    },
    max: {
      type: Number,
      value: 10,
    },
    activeColor: {
      type: String,
      value: '#3f86ff',
    },
  },

  data: {
    percent: 0,
    trackRect: null,
  },

  observers: {
    'value, max': function (value, max) {
      const safeMax = max || 1;
      const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
      this.setData({ percent });
    },
  },

  methods: {
    measureTrack(callback) {
      const query = this.createSelectorQuery();
      query.select('.slider-track').boundingClientRect((rect) => {
        if (rect) {
          this.setData({ trackRect: rect });
        }
        if (callback) callback(rect || this.data.trackRect);
      }).exec();
    },

    updateFromClientX(clientX, emitType) {
      const rect = this.data.trackRect;
      if (!rect) return;

      const raw = ((clientX - rect.left) / rect.width) * this.data.max;
      const value = Math.max(0, Math.min(this.data.max, Math.round(raw * 10) / 10));
      const percent = (value / this.data.max) * 100;

      this.setData({ percent });
      this.triggerEvent(emitType, { value });
    },

    handleTouchStart(event) {
      const clientX = event.touches[0].clientX;
      this.measureTrack(() => {
        this.updateFromClientX(clientX, 'changing');
      });
    },

    handleTouchMove(event) {
      const clientX = event.touches[0].clientX;
      this.updateFromClientX(clientX, 'changing');
    },

    handleTouchEnd(event) {
      const changedTouch = event.changedTouches && event.changedTouches[0];
      if (!changedTouch) return;
      this.updateFromClientX(changedTouch.clientX, 'change');
    },

    handleTap(event) {
      const clientX = event.changedTouches && event.changedTouches[0]
        ? event.changedTouches[0].clientX
        : event.detail.x;
      this.measureTrack(() => {
        this.updateFromClientX(clientX, 'change');
      });
    },
  },
});
