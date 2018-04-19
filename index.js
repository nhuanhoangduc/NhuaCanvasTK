
const Events = {
    MouseMove: 'PapayaTools.events.mouseMove',
    MouseDown: 'PapayaTools.events.mouseDown',
    DoubleClick: 'PapayaTools.events.doubleClick',
    Editable: 'PapayaTools.events.editable',
};


const ObjectTypes = {
    Rectangle: 'PapayaTools.objectTypes.rectangle',
    Polygon: 'PapayaTools.objectTypes.polygon',
};

const Tools = ObjectTypes;


const Planes = {
    Axial: 'PapayaTools.planes.axial',
    Sagittal: 'PapayaTools.planes.sagittal',
    Coronal: 'PapayaTools.planes.coronal',
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

    this.render = function(context, viewer, screenSlice, color) {
        const coord = this.getLocation(viewer, screenSlice);

        context.beginPath();
        context.lineWidth = this.width;
        context.arc(coord.x, coord.y, 5, 0, 2 * Math.PI);
        context.strokeStyle = color || this.color;
        context.stroke();
    };
};


const ReactangleObject = function() {
    this.type = ObjectTypes.Rectangle;
    this.startPoint = null;
    this.endPoint = null;

    this.slice = null;
    this.currentSlice = null;

    this.editingDelta = 5;
    this.initiatedEvents = false;
    
    this.isEditable = false;
    this.isDragging = false;

    this.isSelectedStartPoint = false;
    this.isSelectedEndPoint = false;

    this.handlers = {};
    this.id = Date.now();
    

    this.render = function(context, viewer, screenSlice, color) {
        this.startPoint.render(context, viewer, screenSlice, color);
        this.endPoint.render(context, viewer, screenSlice, color);

        const startLocation = this.startPoint.getLocation(viewer, screenSlice);
        const endLocation = this.endPoint.getLocation(viewer, screenSlice);

        const x = Math.min(startLocation.x, endLocation.x);
        const y = Math.min(startLocation.y, endLocation.y);

        const width = Math.abs(startLocation.x - endLocation.x);
        const height = Math.abs(startLocation.y - endLocation.y);

        context.beginPath();
        context.lineWidth = 2;
        context.rect(x, y, width, height);
        context.strokeStyle = color || '#26A65B';
        context.stroke();
    };


    this.removeEvents = function(element) {
        if (!this.initiatedEvents) {
            return;
        }

        element.removeEventListener('mousemove', this.handlers.mousemove);
        element.removeEventListener('mousedown', this.handlers.mousedown);
        element.removeEventListener('mouseup', this.handlers.mouseup);

        this.initiatedEvents = false;
    };


    this.initEvents = function(tool, element, context, viewer, screenSlice) {
        if (this.initiatedEvents) {
            return;
        }

        this.handlers.mousemove = this.mousemoveHandler(tool, element, context, viewer, screenSlice).bind(this);
        this.handlers.mousedown = this.mousedownHandler(tool, element, context, viewer, screenSlice).bind(this);
        this.handlers.mouseup = this.mouseupHandler(tool, element, context, viewer, screenSlice).bind(this);

        element.addEventListener('mousemove', this.handlers.mousemove);
        element.addEventListener('mousedown', this.handlers.mousedown);
        element.addEventListener('mouseup', this.handlers.mouseup);

        this.initiatedEvents = true;
    };


    this.mouseupHandler = function(tool, element, context, viewer, screenSlice) {
        return (event) => {
            this.beforeEditingFrame = null;

            if (this.isDragging) {
                tool.addPapayaEvents();
                tool.cleanAndRerenderInitFrame();
                tool.render();
            }

            this.isDragging = false;
            this.isEditable = false;
        };
    };


    this.mousedownHandler = function(tool, element, context, viewer, screenSlice) {
        return (event) => {
            if (!this.isEditable) {
                this.isDragging = false;
                return;
            }

            this.isDragging = true;
            tool.removePapayaEvents();
        };
    };


    this.mousemoveHandler = function(tool, element, context, viewer, screenSlice) {
        return (event) => {
            if (!this.startPoint || !this.endPoint || this.currentSlice !== screenSlice.currentSlice) {
                return;
            }

            const positionX = papaya.utilities.PlatformUtils.getMousePositionX(event);
            const positionY = papaya.utilities.PlatformUtils.getMousePositionY(event);

            const currentSlice = viewer.findClickedSlice(viewer, positionX, positionY);
            const currentCoord = viewer.getCoord(viewer, positionX, positionY);
            const currentLocation = tool.getLocation(currentCoord, viewer, screenSlice);

            const startLocation = this.startPoint.getLocation(viewer, screenSlice);
            const endLocation = this.endPoint.getLocation(viewer, screenSlice);

            const startDistance = Math.sqrt(Math.pow((currentLocation.x - startLocation.x), 2) + Math.pow((currentLocation.y - startLocation.y), 2));
            const endDistance = Math.sqrt(Math.pow((currentLocation.x - endLocation.x), 2) + Math.pow((currentLocation.y - endLocation.y), 2));
            
            if (screenSlice != currentSlice) {
                return;
            }


            // Drag
            if (this.isDragging) {
                if (this.isSelectedStartPoint) {
                    this.startPoint.x = currentCoord.x;
                    this.startPoint.y = currentCoord.y;
                }

                if (this.isSelectedEndPoint) {
                    this.endPoint.x = currentCoord.x;
                    this.endPoint.y = currentCoord.y;
                }

                tool.cleanAndRerenderInitFrame();
                tool.renderAndIgnoreObject(this);
                this.render(context, viewer, screenSlice, 'red');
                return;
            }


            // Checking 
            if (startDistance <= this.editingDelta) {
                this.render(context, viewer, screenSlice, 'red');
                this.isEditable = true;
                this.isSelectedStartPoint = true;

                element.dispatchEvent(new CustomEvent(Events.Editable, { detail: { isEditable: true, id: this.id } }));
            } else if (endDistance <= this.editingDelta) {
                this.render(context, viewer, screenSlice, 'red');
                this.isEditable = true;
                this.isSelectedEndPoint = true;

                element.dispatchEvent(new CustomEvent(Events.Editable, { detail: { isEditable: true, id: this.id } }));
            } else if(!this.isDragging) {
                if (this.isEditable) {
                    tool.cleanAndRerenderInitFrame();
                    tool.render();
                }

                this.isEditable = false;
                this.isSelectedStartPoint = false;
                this.isSelectedEndPoint = false;

                element.dispatchEvent(new CustomEvent(Events.Editable, { detail: { isEditable: false, id: this.id } }));
            }
        };
    };
};


const PolygonObject = function() {
    this.type = ObjectTypes.Polygon;

    this.slice = null;
    this.currentSlice = null;

    this.points = [];

    this.editingDelta = 5;
    this.initiatedEvents = false;
    
    this.isEditable = false;
    this.isDragging = false;

    this.screenSlice = null;
    this.selectedPoint = null;

    this.handlers = {};
    this.id = Date.now();


    this.render = function(context, viewer, screenSlice, color) {
        this.points.forEach((point) => {
            point.render(context, viewer, screenSlice, color);
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
            context.strokeStyle = color || '#f1c40f';
            context.lineWidth = 2;
            context.fillStyle = 'rgba(243, 156, 18, 0.1)';
            context.fill();
            context.stroke();
        }
    };

    this.removeEvents = function(element) {
        if (!this.initiatedEvents) {
            return;
        }

        element.removeEventListener('mousemove', this.handlers.mousemove);
        element.removeEventListener('mousedown', this.handlers.mousedown);
        element.removeEventListener('mouseup', this.handlers.mouseup);

        this.initiatedEvents = false;
    };


    this.initEvents = function(tool, element, context, viewer, screenSlice) {
        if (this.initiatedEvents) {
            return;
        }

        this.handlers.mousemove = this.mousemoveHandler(tool, element, context, viewer, screenSlice).bind(this);
        this.handlers.mousedown = this.mousedownHandler(tool, element, context, viewer, screenSlice).bind(this);
        this.handlers.mouseup = this.mouseupHandler(tool, element, context, viewer, screenSlice).bind(this);

        element.addEventListener('mousemove', this.handlers.mousemove);
        element.addEventListener('mousedown', this.handlers.mousedown);
        element.addEventListener('mouseup', this.handlers.mouseup);

        this.initiatedEvents = true;
    };


    this.mouseupHandler = function(tool, element, context, viewer, screenSlice) {
        return (event) => {
            this.beforeEditingFrame = null;

            if (this.isDragging) {
                tool.addPapayaEvents();
                tool.cleanAndRerenderInitFrame();
                tool.render();
            }

            this.isDragging = false;
            this.isEditable = false;
        };
    };


    this.mousedownHandler = function(tool, element, context, viewer, screenSlice) {
        return (event) => {
            if (!this.isEditable) {
                this.isDragging = false;
                return;
            }

            this.isDragging = true;
            tool.removePapayaEvents();
        };
    };


    this.mousemoveHandler = function(tool, element, context, viewer, screenSlice) {
        return (event) => {
            if (this.points.length === 0 || this.currentSlice != screenSlice.currentSlice) {
                return;
            }

            const positionX = papaya.utilities.PlatformUtils.getMousePositionX(event);
            const positionY = papaya.utilities.PlatformUtils.getMousePositionY(event);

            const currentSlice = viewer.findClickedSlice(viewer, positionX, positionY);
            const currentCoord = viewer.getCoord(viewer, positionX, positionY);
            const currentLocation = tool.getLocation(currentCoord, viewer, screenSlice);

            if (screenSlice != currentSlice) {
                return;
            }


            // Drag
            if (this.isDragging) {
                this.selectedPoint.x = currentCoord.x;
                this.selectedPoint.y = currentCoord.y;

                tool.cleanAndRerenderInitFrame();
                tool.renderAndIgnoreObject(this);
                this.render(context, viewer, screenSlice, 'red');
                return;
            }


            // Checking
            for (let i = 0; i < this.points.length; i++) {
                const point = this.points[i];
                const pointLocation = point.getLocation(viewer, screenSlice);
                const pointDistance = Math.sqrt(Math.pow((currentLocation.x - pointLocation.x), 2) + Math.pow((currentLocation.y - pointLocation.y), 2));
                
                
                if (pointDistance <= this.editingDelta) {
                    this.isEditable = true;

                    if (this.selectedPoint !== point) {
                        this.render(context, viewer, screenSlice, 'red');
                        this.selectedPoint = point;
                    }
                    
                    element.dispatchEvent(new CustomEvent(Events.Editable, { detail: { isEditable: true, id: this.id } }));
                    return;
                }
            }


            if (this.isEditable) {
                tool.cleanAndRerenderInitFrame();
                tool.render();
            }

            this.isEditable = false;
            this.selectedPoint = null;
            element.dispatchEvent(new CustomEvent(Events.Editable, { detail: { isEditable: false, id: this.id } }));
        };
    };
};



const PapayaTools = function() {

    this.viewer = null;

    this.element = null;
    this.context = null;
    
    this.initFrame = null;
    
    this.activeTool = null;

    this.objects = [];
    this.currentObject = null;

    this.selectedSlice = null;

    this.eventHandler = null;

    this.unsetToolSubscribers = [];



    this.initEvents = function() {
        this.element.addEventListener('mousemove', (event) => {
            this.element.dispatchEvent(new CustomEvent(Events.MouseMove, {
                detail: {
                    type: Events.MouseMove,
                    event,
                },
            }));
        });

        this.element.addEventListener('mousedown', (event) => {
            this.element.dispatchEvent(new CustomEvent(Events.MouseDown, {
                detail: {
                    type: Events.MouseDown,
                    event,
                },
            }));
        });

        this.element.addEventListener('dblclick', (event) => {
            this.element.dispatchEvent(new CustomEvent(Events.DoubleClick, {
                detail: {
                    type: Events.DoubleClick,
                    event,
                },
            }));
        });
    };


    this.subscribeEvents = function(handler) {
        this.eventHandler = handler.bind(this);

        this.element.addEventListener(Events.MouseMove, this.eventHandler);
        this.element.addEventListener(Events.MouseDown, this.eventHandler);
        this.element.addEventListener(Events.DoubleClick, this.eventHandler);
    };


    this.unsubscribeEvents = function() {
        this.element.removeEventListener(Events.MouseMove, this.eventHandler);
        this.element.removeEventListener(Events.MouseDown, this.eventHandler);
        this.element.removeEventListener(Events.DoubleClick, this.eventHandler);

        this.eventHandler = null;
    };


    this.setElement = function(element) {
        this.element = element;
        this.context = this.element.getContext('2d');
        this.initFrame = this.element.toDataURL('image/jpeg');

        this.initEvents();
        return this;
    };


    this.setViewer = function(viewer) {
        this.viewer = viewer;
        this.viewer.onDrawViewer(() => {
            this.initFrame = this.element.toDataURL('image/jpeg');
            this.render();
        });
    }


    this.setTool = function(tool) {
        if (this.activeTool) {
            return;
        }


        this.activeTool = tool;

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

        this.removePapayaEvents();
    };


    this.removePapayaEvents = function() {
        this.viewer.removeScroll();
        this.viewer.removeEvents();
    };


    this.addPapayaEvents = function() {
        this.removePapayaEvents();
        this.viewer.addScroll();
        this.viewer.addEvents();
    };


    this.isActive = function() {
        return this.activeTool;
    };


    this.unsetTool = function(tool) {
        this.activeTool = null;
        this.currentObject = null;
        this.selectedSlice = null;

        this.unsubscribeEvents();
    };


    this.onFinish = function(subscriber) {
        this.unsetToolSubscribers.push(subscriber);
    };


    this.cleanAndRerenderInitFrame = function() {
        const canvasPic = new Image();
        canvasPic.src = this.initFrame;
        this.context.drawImage(canvasPic, 0, 0);
    };


    this.pushObject = function(object, selectedSlice) {
        if (selectedSlice === this.viewer.axialSlice) {
            object.slice = Planes.Axial;
            object.currentSlice = selectedSlice.currentSlice;
            this.objects.push(object);
        }

        if (selectedSlice === this.viewer.coronalSlice) {
            object.slice = Planes.Coronal;
            object.currentSlice = selectedSlice.currentSlice;
            this.objects.push(object);
        }

        if (selectedSlice === this.viewer.sagittalSlice) {
            object.slice = Planes.Sagittal;
            object.currentSlice = selectedSlice.currentSlice;
            this.objects.push(object);
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

        const currentSlice = this.viewer.findClickedSlice(this.viewer, positionX, positionY);
        const currentCoord = this.viewer.getCoord(this.viewer, positionX, positionY);

        if (this.selectedSlice && this.selectedSlice != currentSlice) {
            return;
        }


        switch (type) {
            case Events.MouseDown:
                if (!this.currentObject.startPoint) {
                    const pointer = new PointerObject(currentCoord.x , currentCoord.y);
                    this.currentObject.startPoint = pointer;
                    this.currentObject.startPoint.render(this.context, this.viewer, currentSlice);
                    this.selectedSlice = currentSlice;
                } else {
                    this.cleanAndRerenderInitFrame();
                    this.renderAndIgnoreObject(this.currentObject);

                    const pointer = new PointerObject(currentCoord.x , currentCoord.y);
                    this.currentObject.endPoint = pointer;

                    this.currentObject.render(this.context, this.viewer, this.selectedSlice);
                    this.currentObject.initEvents(this, this.element, this.context, this.viewer, this.selectedSlice);
                    
                    this.pushObject(this.currentObject, this.selectedSlice);
                    this.unsetTool(this.activeTool);
                    this.unsetToolSubscribers.forEach(subscriber => subscriber());
                }
                break;


            case Events.MouseMove:
                if (this.currentObject.startPoint && !this.currentObject.endPoint) {
                    this.cleanAndRerenderInitFrame();
                    this.renderAndIgnoreObject(this.currentObject);

                    this.currentObject.startPoint.render(this.context, this.viewer, this.selectedSlice);
                    const startLocation = this.currentObject.startPoint.getLocation(this.viewer, this.selectedSlice);
                    const endLocation = this.getLocation(currentCoord, this.viewer, this.selectedSlice);

                    const x = Math.min(startLocation.x, endLocation.x);
                    const y = Math.min(startLocation.y, endLocation.y);

                    const width = Math.abs(startLocation.x - endLocation.x);
                    const height = Math.abs(startLocation.y - endLocation.y);

                    this.context.beginPath();
                    this.context.lineWidth = 1.5;
                    this.context.rect(x, y, width, height);
                    this.context.strokeStyle = '#e55039';
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

        const currentSlice = this.viewer.findClickedSlice(this.viewer, positionX, positionY);
        const currentCoord = this.viewer.getCoord(this.viewer, positionX, positionY);

        if (this.selectedSlice && this.selectedSlice != currentSlice) {
            return;
        }

        const pushPoint = () => {
            const newPoint = new PointerObject(currentCoord.x , currentCoord.y);
            
            if (this.currentObject.points.length === 0) {
                this.currentObject.points.push(newPoint);
                this.currentObject.render(this.context, this.viewer, this.selectedSlice);
            } else {
                const lastPoint = this.currentObject.points[this.currentObject.points.length - 1];
                if (newPoint.x === lastPoint.x && newPoint.y === lastPoint.y) {
                    return;
                }
                
                this.currentObject.points.push(newPoint);
                this.currentObject.render(this.context, this.viewer, this.selectedSlice);
            }
        };


        switch (type) {
            case Events.DoubleClick:
                this.cleanAndRerenderInitFrame();
                this.renderAndIgnoreObject(this.currentObject);
                
                if (this.currentObject.points.length > 2) {
                    pushPoint();

                    this.currentObject.render(this.context, this.viewer, this.selectedSlice);
                    this.currentObject.initEvents(this, this.element, this.context, this.viewer, this.selectedSlice);

                    this.pushObject(this.currentObject, this.selectedSlice);
                    this.unsetTool(this.activeTool);
                    this.unsetToolSubscribers.forEach(subscriber => subscriber());
                } else {
                    this.unsetTool(this.activeTool);
                    this.unsetToolSubscribers.forEach(subscriber => subscriber());
                }
                break;


            case Events.MouseDown:
                if (!this.selectedSlice) {
                    this.selectedSlice = currentSlice;
                }
                pushPoint();
                break;


            case Events.MouseMove:
                if (this.currentObject.points.length >= 2) {
                    this.cleanAndRerenderInitFrame();
                    this.renderAndIgnoreObject(this.currentObject);

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
                } else if (this.currentObject.points.length === 1) {
                    this.cleanAndRerenderInitFrame();
                    this.renderAndIgnoreObject(this.currentObject);
                    
                    this.currentObject.points[0].render(this.context, this.viewer, this.selectedSlice);

                    const startLocation = this.currentObject.points[0].getLocation(this.viewer, this.selectedSlice);
                    const currentLocation = this.getLocation(currentCoord, this.viewer, this.selectedSlice);

                    this.context.beginPath();
                    this.context.moveTo(currentLocation.x, currentLocation.y);
                    this.context.lineTo(startLocation.x, startLocation.y);
                    this.context.stroke();
                }
                break;
        }
    };


    this.render = function() {
        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];
            let screenSlice = null;

            if (object.slice === Planes.Axial) {
                screenSlice = this.viewer.axialSlice;
            }
    
            if (object.slice === Planes.Coronal) {
                screenSlice = this.viewer.coronalSlice;
            }
    
            if (object.slice === Planes.Sagittal) {
                screenSlice = this.viewer.sagittalSlice;
            }

            if (screenSlice.currentSlice === object.currentSlice) {
                object.render(this.context, this.viewer, screenSlice);
                object.initEvents(this, this.element, this.context, this.viewer, screenSlice);
            }
        }
    };


    this.renderAndIgnoreObject = function(ignoredObject) {
        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];
            let screenSlice = null;

            if (object.slice === Planes.Axial) {
                screenSlice = this.viewer.axialSlice;
            }
    
            if (object.slice === Planes.Coronal) {
                screenSlice = this.viewer.coronalSlice;
            }
    
            if (object.slice === Planes.Sagittal) {
                screenSlice = this.viewer.sagittalSlice;
            }

            if (screenSlice.currentSlice === object.currentSlice && object != ignoredObject) {
                object.render(this.context, this.viewer, screenSlice);
                object.initEvents(this, this.element, this.context, this.viewer, screenSlice);
            }
        }
    };


    this.cleanObjectsOnCurrentScreen = function() {
        let index = 0;

        while (index < this.objects.length) {
            const object = this.objects[index];

            if (object.slice === Planes.Axial && object.currentSlice === this.viewer.axialSlice.currentSlice) {
                object.removeEvents(this.element);
                this.objects.splice(index, 1);
                continue;
            } 
            
            if (object.slice === Planes.Coronal && object.currentSlice === this.viewer.coronalSlice.currentSlice) {
                object.removeEvents(this.element);
                this.objects.splice(index, 1);
                continue;
            }
            
            if (object.slice === Planes.Sagittal && object.currentSlice === this.viewer.sagittalSlice.currentSlice) {
                object.removeEvents(this.element);
                this.objects.splice(index, 1);
                continue;
            }
            
            index++;
        }

        this.cleanAndRerenderInitFrame();
    }


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

        this.objects.push(newObject);

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
        return JSON.parse(JSON.stringify(this.objects));
    };
};


export { 
    PapayaTools,
    Tools,
    Events,
};



function papayaToolsManager() {

    this.tool = null;

    this.isFinished = false;

    this.element = null;
    this.editableElements = {};

    this.handlers = {};

    
    this.setTool = function(tool) {
        if (window.papayaTools.isActive()) {
            this.unsetTool();
        }

        this.tool = tool;
        window.papayaTools.setTool(tool);
        this.isFinished = true;
    };


    this.unsetTool = function() {
        this.tool = null;

        window.papayaTools.unsetTool();
        window.papayaTools.addPapayaEvents();
    };
    

    this.isEditable = function() {
        for (let editableElementId in this.editableElements) {
            if (this.editableElements[editableElementId]) {
                return true;
            }
        }

        return false;
    }


    this.listenEvents = function(element) {
        this.element = element;

        const editableHandler = (payload) => {
            const isEditable = payload.detail.isEditable;
            const editableElementId = payload.detail.id;
            
            this.editableElements[editableElementId] = isEditable;
        };
        element.addEventListener(Events.Editable, editableHandler);


        const mousedownHandler = function() {
            if (!this.isFinished && !this.isEditable()) {
                this.isFinished = false;
                
                // this.element.removeEventListener('mousemove', this.handlers.mousemoveHandler);
                // this.element.removeEventListener('mousedown', this.handlers.mousedownHandler);
            }
        };

    
        const mousemoveHandler = function() {
            if (this.isFinished && !this.isEditable()) {
                if (!window.papayaTools.isActive()) {
                    window.papayaTools.setTool(this.tool);
                }
            } else if (this.isFinished && this.isEditable()) {
                window.papayaTools.unsetTool();
            }
        }


        this.handlers.mousemoveHandler = mousemoveHandler.bind(this);
        this.handlers.mousedownHandler = mousedownHandler.bind(this);
        

        window.papayaTools.onFinish(() => {
            this.editableElements = {};
            this.isFinished = true;

            element.addEventListener('mousemove', this.handlers.mousemoveHandler);
            element.addEventListener('mousedown', this.handlers.mousedownHandler);
        });
    };


    this.reset = function() {
        window.papayaTools.cleanObjectsOnCurrentScreen();
    };
};

