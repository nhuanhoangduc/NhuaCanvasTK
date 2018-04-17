const PointerObject = function(x, y) {
    this.x = x;
    this.y = y;
    this.color = 'red';
    this.width = 1;

    this.render = function(context) {
        context.beginPath();
        context.lineWidth = this.width;
        context.arc(this.x, this.y, 10, 0, 2 * Math.PI);
        context.strokeStyle = this.color;
        context.stroke();
    };
};


const ReactangleObject = function() {
    this.type = 'rectangle';
    this.startPoint = null;
    this.endPoint = null;

    this.render = function(context) {
        if (this.startPoint) {
            this.startPoint.render(context);
        }

        if (this.endPoint) {
            this.endPoint.render(context);

            const x = Math.min(this.startPoint.x, this.endPoint.x);
            const y = Math.min(this.startPoint.y, this.endPoint.y);

            const width = Math.abs(this.startPoint.x - this.endPoint.x);
            const height = Math.abs(this.startPoint.y - this.endPoint.y);

            context.beginPath();
            context.lineWidth = 1;
            context.rect(x, y, width, height);
            context.strokeStyle = 'black';
            context.stroke();
        }
    };
};


const NhuanCanvasTK = function() {

    this.viewer = null;

    this.element = null;
    this.context = null;
    
    this.currentFrame = null;
    this.beforeDrawFrame = null;
    this.frames = [];
    
    this.tools = ['rectangle'];
    this.activeTool = this.tools[0];

    this.axialObjects = [];
    this.coronalObjects = [];
    this.sagittalObjects = [];
    this.currentObject = null;

    this.eventHandler = null;

    this.Events = {
        MouseMove: 'NhuanCanvasTK.mouseMove',
        MouseDown: 'NhuanCanvasTK.mouseDown',
        DoubleClick: 'NhuanCanvasTK.doubleClick',
    };

    this.unsetToolSubscribers = [];


    this.subscribeEvents = function(handler) {
        this.eventHandler = handler.bind(this);

        this.element.addEventListener(this.Events.MouseMove, this.eventHandler);
        this.element.addEventListener('mousemove', (event) => {
            this.element.dispatchEvent(new CustomEvent(this.Events.MouseMove, {
                detail: {
                    type: this.Events.MouseMove,
                    event,
                },
            }));
        });


        this.element.addEventListener(this.Events.MouseDown, this.eventHandler);
        this.element.addEventListener('mousedown', (event) => {
            this.element.dispatchEvent(new CustomEvent(this.Events.MouseDown, {
                detail: {
                    type: this.Events.MouseDown,
                    event,
                },
            }));
        });


        this.element.addEventListener(this.Events.DoubleClick, this.eventHandler);
        this.element.addEventListener('dblclick', (event) => {
            this.element.dispatchEvent(new CustomEvent(this.Events.DoubleClick, {
                detail: {
                    type: this.Events.DoubleClick,
                    event,
                },
            }));
        });
        

    };


    this.unsubscribeEvents = function() {
        this.element.removeEventListener(this.Events.MouseMove, this.eventHandler);
        this.element.removeEventListener(this.Events.MouseDown, this.eventHandler);
        this.element.removeEventListener(this.Events.DoubleClick, this.eventHandler);
    };


    this.setElement = function(element) {
        this.element = element;
        this.context = this.element.getContext('2d');

        this.currentFrame = this.element.toDataURL();

        return this;
    };


    this.setViewer = function(viewer) {
        this.viewer = viewer;
        this.viewer.onDrawViewer(() => {
            console.log('drawed');
        });
    }


    this.setTool = function(tool) {
        this.activeTool = tool;

        switch (this.activeTool) {
            case 'rectangle':
                this.currentObject = new ReactangleObject();
                this.subscribeEvents(this.reactangleHandler);
                break;
            
        }

        console.log(this.viewer)
        this.viewer.toggleMainCrosshairs = false
        this.viewer.removeScroll();
        this.viewer.removeEvents();
    };


    this.unsetTool = function(tool) {
        this.activeTool = null;

        switch (tool) {
            case 'rectangle':
                this.unsubscribeEvents(this.reactangleHandler);
                break;
            
        }

        this.unsetToolSubscribers.forEach(subscriber => subscriber());
        this.viewer.toggleMainCrosshairs = true;
        this.viewer.addScroll();
        this.viewer.addEvents();
    };


    this.onFinish = function(subscriber) {
        this.unsetToolSubscribers.push(subscriber);
    };


    this.cleanAndRerender = function() {
        this.context.clearRect(0, 0, this.element.width, this.element.height);

        const canvasPic = new Image();
        canvasPic.src = this.beforeDrawFrame;
        this.context.drawImage(canvasPic, 0, 0);
    };

    
    this.reactangleHandler = function(payload) {
        const type = payload.detail.type;
        const event = payload.detail.event;

        const offsetX = event.offsetX;
        const offsetY = event.offsetY;

        switch (type) {
            case this.Events.MouseDown:
                if (!this.currentObject.startPoint) {
                    const pointer = new PointerObject(offsetX , offsetY);
                    this.currentObject.startPoint = pointer;
                    this.currentObject.render(this.context);
                    this.beforeDrawFrame = this.element.toDataURL();
                } else {
                    this.cleanAndRerender();

                    const pointer = new PointerObject(offsetX , offsetY);
                    this.currentObject.endPoint = pointer;
                    this.currentObject.render(this.context);

                    // this.objects.push(this.currentObject);
                    this.unsetTool(this.activeTool);
                }
                break;


            case this.Events.MouseMove:
                if (this.currentObject.startPoint && !this.currentObject.endPoint) {
                    const Point = this.currentObject.startPoint;

                    const x = Math.min(Point.x, offsetX);
                    const y = Math.min(Point.y, offsetY);

                    const width = Math.abs(Point.x - offsetX);
                    const height = Math.abs(Point.y - offsetY);

                    this.cleanAndRerender();
                    // this.currentObject.render(this.context);

                    this.context.beginPath();
                    this.context.lineWidth = 0.4;
                    this.context.rect(x, y, width, height);
                    this.context.strokeStyle = 'black';
                    this.context.stroke();
                }
                break;
        }
    };
};


window.onload = function() {
    // const element = document.getElementById('canvas');
    // const ntk = new NhuanCanvasTK();
    // ntk.setElement(element);
    // ntk.setTool('rectangle')
};