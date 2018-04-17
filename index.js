
const Events = {
    MouseMove: 'NhuaPapayaTK.events.mouseMove',
    MouseDown: 'NhuaPapayaTK.events.mouseDown',
    DoubleClick: 'NhuaPapayaTK.events.doubleClick',
};


const ObjectTypes = window.papayaTools = {
    Rectangle: 'NhuaPapayaTK.objectTypes.rectangle',
    Polygon: 'NhuaPapayaTK.objectTypes.polygon',
};


const Planes = {
    Axial: 'NhuaPapayaTK.planes.axial',
    Sagittal: 'NhuaPapayaTK.planes.sagittal',
    Coronal: 'NhuaPapayaTK.planes.coronal',
};



const PointerObject = function(x, y) {
    this.x = x;
    this.y = y;

    this.color = '#F9690E';
    this.width = 2;

    this.getLocation = function(viewer, screenSlice) {
        if (screenSlice === viewer.axialSlice) {
            return viewer.convertCoordinateToScreen({ x: this.x, y: this.y }, screenSlice);
        }

        if (screenSlice === viewer.coronalSlice) {
            return viewer.convertCoordinateToScreen({ x: this.x, z: this.y }, screenSlice);
        }

        if (screenSlice === viewer.sagittalSlice) {
            return viewer.convertCoordinateToScreen({ y: this.x, z: this.y }, screenSlice);
        }
        
    };

    this.render = function(context, viewer, screenSlice) {
        const coord = this.getLocation(viewer, screenSlice);

        context.beginPath();
        context.lineWidth = this.width;
        context.arc(coord.x, coord.y, 5, 0, 2 * Math.PI);
        context.strokeStyle = this.color;
        context.stroke();
    };
};


const ReactangleObject = function() {
    this.type = ObjectTypes.Rectangle;
    this.startPoint = null;
    this.endPoint = null;

    this.slice = null;
    this.currentSlice = null;

    this.render = function(context, viewer, screenSlice) {
        if (this.startPoint) {
            this.startPoint.render(context, viewer, screenSlice);
        }

        if (this.endPoint) {
            this.endPoint.render(context, viewer, screenSlice);

            const startLocation = this.startPoint.getLocation(viewer, screenSlice);
            const endLocation = this.endPoint.getLocation(viewer, screenSlice);

            const x = Math.min(startLocation.x, endLocation.x);
            const y = Math.min(startLocation.y, endLocation.y);

            const width = Math.abs(startLocation.x - endLocation.x);
            const height = Math.abs(startLocation.y - endLocation.y);

            context.beginPath();
            context.lineWidth = 2;
            context.rect(x, y, width, height);
            context.strokeStyle = '#26A65B';
            context.stroke();
        }
    };
};


const PolygonObject = function() {
    this.type = ObjectTypes.Polygon;

    this.slice = null;
    this.currentSlice = null;

    this.points = [];

    this.render = function(context, viewer, screenSlice) {
        this.points.forEach((point) => {
            point.render(context, viewer, screenSlice);
        });


        if (this.points.length >= 2) {
            const startLocation = this.points[0].getLocation(viewer, screenSlice);

            context.beginPath();
            context.moveTo(startLocation.x, startLocation.y);

            for (let i = 1; i < this.points.length; i++) {
                const point = this.points[i];
                const location = point.getLocation(viewer, screenSlice);
                
                context.lineTo(location.x, location.y);
            }

            context.closePath();
            context.strokeStyle = '#f1c40f';
            context.lineWidth = 2;
            context.fillStyle = 'rgba(243, 156, 18, 0.1)';
            context.fill();
            context.stroke();
        }
    };
};



const NhuaPapayaTK = function() {

    this.viewer = null;

    this.element = null;
    this.context = null;
    
    this.beforeDrawFrame = null;
    this.frames = [];
    
    this.tools = [ObjectTypes.Rectangle];
    this.activeTool = this.tools[0];

    this.axialObjects = [];
    this.coronalObjects = [];
    this.sagittalObjects = [];
    this.currentObject = null;

    this.selectedSlice = null;

    this.eventHandler = null;

    this.unsetToolSubscribers = [];


    this.subscribeEvents = function(handler) {
        this.eventHandler = handler.bind(this);

        this.element.addEventListener(Events.MouseMove, this.eventHandler);
        this.element.addEventListener('mousemove', (event) => {
            this.element.dispatchEvent(new CustomEvent(Events.MouseMove, {
                detail: {
                    type: Events.MouseMove,
                    event,
                },
            }));
        });


        this.element.addEventListener(Events.MouseDown, this.eventHandler);
        this.element.addEventListener('mousedown', (event) => {
            this.element.dispatchEvent(new CustomEvent(Events.MouseDown, {
                detail: {
                    type: Events.MouseDown,
                    event,
                },
            }));
        });


        this.element.addEventListener(Events.DoubleClick, this.eventHandler);
        this.element.addEventListener('dblclick', (event) => {
            this.element.dispatchEvent(new CustomEvent(Events.DoubleClick, {
                detail: {
                    type: Events.DoubleClick,
                    event,
                },
            }));
        });
        

    };


    this.unsubscribeEvents = function() {
        this.element.removeEventListener(Events.MouseMove, this.eventHandler);
        this.element.removeEventListener(Events.MouseDown, this.eventHandler);
        this.element.removeEventListener(Events.DoubleClick, this.eventHandler);
    };


    this.setElement = function(element) {
        this.element = element;
        this.context = this.element.getContext('2d');
        return this;
    };


    this.setViewer = function(viewer) {
        this.viewer = viewer;
        this.viewer.onDrawViewer(() => {
            this.render();
        });
    }


    this.setTool = function(tool) {
        this.activeTool = tool;
        this.beforeDrawFrame = this.element.toDataURL();

        switch (this.activeTool) {
            case ObjectTypes.Rectangle:
                this.currentObject = new ReactangleObject();
                this.subscribeEvents(this.reactangleHandler);
                break;

            case ObjectTypes.Polygon:
                this.currentObject = new PolygonObject();
                this.subscribeEvents(this.polygonHandler);
                break;
            
        }

        this.viewer.toggleMainCrosshairs = false
        this.viewer.removeScroll();
        this.viewer.removeEvents();
    };


    this.unsetTool = function(tool) {
        this.activeTool = null;

        switch (tool) {
            case ObjectTypes.Rectangle:
                this.unsubscribeEvents();
                break;

            case ObjectTypes.Polygon:
                this.unsubscribeEvents();
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


    this.pushObject = function(object, selectedSlice) {
        if (selectedSlice === this.viewer.axialSlice) {
            object.slice = Planes.Axial;
            object.currentSlice = selectedSlice.currentSlice;
            this.axialObjects.push(object);
        }

        if (selectedSlice === this.viewer.coronalSlice) {
            object.slice = Planes.Coronal;
            object.currentSlice = selectedSlice.currentSlice;
            this.coronalObjects.push(object);
        }

        if (selectedSlice === this.viewer.sagittalSlice) {
            object.slice = Planes.Sagittal;
            object.currentSlice = selectedSlice.currentSlice;
            this.sagittalObjects.push(object);
        }
    }


    this.getLocation = function(coord, viewer, screenSlice) {
        if (screenSlice === viewer.axialSlice) {
            return viewer.convertCoordinateToScreen({ x: coord.x, y: coord.y }, screenSlice);
        }

        if (screenSlice === viewer.coronalSlice) {
            return viewer.convertCoordinateToScreen({ x: coord.x, z: coord.y }, screenSlice);
        }

        if (screenSlice === viewer.sagittalSlice) {
            return viewer.convertCoordinateToScreen({ y: coord.x, z: coord.y }, screenSlice);
        }
    };

    
    this.reactangleHandler = function(payload) {
        const type = payload.detail.type;
        const event = payload.detail.event;

        const positionX = papaya.utilities.PlatformUtils.getMousePositionX(event);
        const positionY = papaya.utilities.PlatformUtils.getMousePositionY(event);

        this.selectedSlice = this.viewer.findClickedSlice(this.viewer, positionX, positionY);
        const currentCoord = this.viewer.getCoord(this.viewer, positionX, positionY);


        switch (type) {
            case Events.MouseDown:
                if (!this.currentObject.startPoint) {
                    const pointer = new PointerObject(currentCoord.x , currentCoord.y);
                    this.currentObject.startPoint = pointer;
                    this.currentObject.render(this.context, this.viewer, this.selectedSlice);
                } else {
                    this.cleanAndRerender();

                    this.viewer.updatePosition(this.viewer, positionX, positionY);

                    const pointer = new PointerObject(currentCoord.x , currentCoord.y);
                    this.currentObject.endPoint = pointer;
                    
                    this.pushObject(this.currentObject, this.selectedSlice);
                    this.currentObject.render(this.context, this.viewer, this.selectedSlice);

                    this.unsetTool(this.activeTool);
                }
                break;


            case Events.MouseMove:
                if (this.currentObject.startPoint && !this.currentObject.endPoint) {
                    const startLocation = this.currentObject.startPoint.getLocation(this.viewer, this.selectedSlice);
                    const endLocation = this.getLocation(currentCoord, this.viewer, this.selectedSlice);

                    const x = Math.min(startLocation.x, endLocation.x);
                    const y = Math.min(startLocation.y, endLocation.y);

                    const width = Math.abs(startLocation.x - endLocation.x);
                    const height = Math.abs(startLocation.y - endLocation.y);

                    this.cleanAndRerender();

                    this.context.beginPath();
                    this.context.lineWidth = 0.4;
                    this.context.rect(x, y, width, height);
                    this.context.strokeStyle = 'black';
                    this.context.stroke();
                }
                break;
        }
    };


    this.polygonHandler = function(payload) {
        const type = payload.detail.type;
        const event = payload.detail.event;

        const positionX = papaya.utilities.PlatformUtils.getMousePositionX(event);
        const positionY = papaya.utilities.PlatformUtils.getMousePositionY(event);

        this.selectedSlice = this.viewer.findClickedSlice(this.viewer, positionX, positionY);
        const currentCoord = this.viewer.getCoord(this.viewer, positionX, positionY);


        switch (type) {
            case Events.DoubleClick:
                this.cleanAndRerender();
                this.viewer.updatePosition(this.viewer, positionX, positionY);
                
                if (this.currentObject.points.length >= 2) {
                    const pointer = new PointerObject(currentCoord.x , currentCoord.y);
                    this.currentObject.points.push(pointer);
                    this.currentObject.render(this.context, this.viewer, this.selectedSlice);

                    this.pushObject(this.currentObject, this.selectedSlice);
                    this.unsetTool(this.activeTool);
                }
                break;


            case Events.MouseDown:
                const pointer = new PointerObject(currentCoord.x , currentCoord.y);
                this.currentObject.points.push(pointer);
                this.currentObject.render(this.context, this.viewer, this.selectedSlice);
                break;


            case Events.MouseMove:
                if (this.currentObject.points.length > 2) {
                    this.cleanAndRerender();
                    this.viewer.updatePosition(this.viewer, positionX, positionY);

                    const currentLocation = this.getLocation(currentCoord, this.viewer, this.selectedSlice);

                    this.context.beginPath();
                    this.context.moveTo(currentLocation.x, currentLocation.y);

                    for (let i = 0; i < this.currentObject.points.length; i++) {
                        const point = this.currentObject.points[i];
                        const location = point.getLocation(this.viewer, this.selectedSlice);

                        this.context.lineTo(location.x, location.y);
                    }

                    this.context.closePath();
                    this.context.stroke();

                    this.currentObject.points.forEach((point) => {
                        point.render(this.context, this.viewer, this.selectedSlice);
                    });
                }
                break;
        }
    };


    this.render = function() {
        this.axialObjects.forEach((object) => {
            if (this.viewer.axialSlice.currentSlice === object.currentSlice) {
                console.log(JSON.stringify(object));
                object.render(this.context, this.viewer, this.viewer.axialSlice);
            }
        });

        this.coronalObjects.forEach((object) => {
            if (this.viewer.coronalSlice.currentSlice === object.currentSlice) {
                object.render(this.context, this.viewer, this.viewer.coronalSlice);
            }
        });

        this.sagittalObjects.forEach((object) => {
            if (this.viewer.sagittalSlice.currentSlice === object.currentSlice) {
                object.render(this.context, this.viewer, this.viewer.sagittalSlice);
            }
        });
    };


    this.loadObject = function(object, willRender) {
        const type = object.type;
        let newObject = null;
        
        switch (type) {
            case ObjectTypes.Rectangle:
                newObject = new ReactangleObject();
                newObject.startPoint = new PointerObject(object.startPoint.x, object.startPoint.y);
                newObject.endPoint = new PointerObject(object.endPoint.x, object.endPoint.y);
                break;

            case ObjectTypes.Polygon:
                newObject = new PolygonObject();
                newObject.points = object.points.map((point) => {
                    return new PointerObject(point.x, point.y);
                });
                break;
        }

        if (!newObject) {
            return;
        }

        newObject.slice = object.slice;
        newObject.currentSlice = object.currentSlice;

        if (object.slice === Planes.Axial) {
            this.axialObjects.push(newObject);
        }

        if (object.slice === Planes.Coronal) {
            this.coronalObjects.push(newObject);
        }

        if (object.slice === Planes.Sagittal) {
            this.sagittalObjects.push(newObject);
        }

        if (willRender) {
            this.render();
        }
    };


    this.loadObjects = function(objects) {
        objects.forEach((object) => {
            this.loadObject(object, false);
        });
        this.render();
    };


    this.getObjects = function() {
        const totalObjects = this.axialObjects.concat(this.coronalObjects).concat(this.sagittalObjects);
        return JSON.parse(JSON.stringify(totalObjects));
    };
};
