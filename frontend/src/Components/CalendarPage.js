import React, { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import './Calendar.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API_URL = `${BACKEND_URL}/api`;

const CalendarPage = React.memo(() => {
  const [events, setEvents] = useState([]);
  const [modalState, setModalState] = useState({ isOpen: false, event: null, isEditing: false });
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [title, setTitle] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handleResize);
    setTimeout(() => {
      if (calendarRef.current && calendarRef.current.getApi) {
        setTitle(calendarRef.current.getApi().view.title);
      }
    }, 0);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchEvents = useCallback((info, successCallback, failureCallback) => {
    axios.get(`${API_URL}/calendar/events?start=${info.startStr}&end=${info.endStr}`)
      .then(response => {
        successCallback(response.data.map(event => ({
          ...event,
          id: event.id,
          allDay: event.allDay,
        })));
      })
      .catch(error => {
        console.error("Error fetching events", error);
        failureCallback(error);
      });
  }, []);

  const handlePrev = () => {
    const api = calendarRef.current.getApi();
    api.prev();
    setTitle(api.view.title);
  };
  const handleNext = () => {
    const api = calendarRef.current.getApi();
    api.next();
    setTitle(api.view.title);
  };
  const handleToday = () => {
    const api = calendarRef.current.getApi();
    api.today();
    setTitle(api.view.title);
  };
  const handleViewChange = (view) => {
    const api = calendarRef.current.getApi();
    api.changeView(view);
    setCurrentView(view);
    setTitle(api.view.title);
  };
  const handleDatesSet = (arg) => {
    setTitle(arg.view.title);
    setCurrentView(arg.view.type);
  };

  const handleDateSelect = useCallback((selectInfo) => {
    setModalState({ isOpen: true, event: { start: selectInfo.startStr, end: selectInfo.endStr, allDay: selectInfo.allDay }, isEditing: false });
  }, []);

  const handleEventClick = useCallback((clickInfo) => {
    setModalState({ isOpen: true, event: clickInfo.event.toPlainObject(), isEditing: true });
  }, []);

  const handleEventChange = useCallback((changeInfo) => {
    const api = calendarRef.current.getApi();
    const { event } = changeInfo;
    let start = event.start;
    let end = event.end ? event.end : event.start;
    if (event.allDay) {
      start = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
    }
    const eventData = {
      title: event.title,
      description: event.extendedProps?.description || '',
      color: event.backgroundColor,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: event.allDay,
    };
    axios.put(`${API_URL}/calendar/events/${event.id}`, eventData)
      .then(() => { api.refetchEvents(); })
      .catch((error) => {
        console.error("Failed to update event:", error);
        changeInfo.revert();
        alert("Could not save event changes. Please try again.");
      });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, event: null, isEditing: false });
  }, []);

  return (
    <div className="calendar-container">
      {isMobile ? (
        <div className="calendar-toolbar">
          <div className="calendar-toolbar-row">
            <button className="calendar-nav-btn" onClick={handlePrev}>&lt;</button>
            <button className="calendar-nav-btn" onClick={handleNext}>&gt;</button>
            <button className="calendar-today-btn" onClick={handleToday}>today</button>
          </div>
          <div className="calendar-title">{title}</div>
          <div className="calendar-toolbar-row calendar-view-switch">
            <button className={`calendar-view-btn${currentView === 'dayGridMonth' ? ' active' : ''}`} onClick={() => handleViewChange('dayGridMonth')}>month</button>
            <button className={`calendar-view-btn${currentView === 'timeGridWeek' ? ' active' : ''}`} onClick={() => handleViewChange('timeGridWeek')}>week</button>
            <button className={`calendar-view-btn${currentView === 'timeGridDay' ? ' active' : ''}`} onClick={() => handleViewChange('timeGridDay')}>day</button>
          </div>
        </div>
      ) : null}
      <div className="calendar-grid-scroll">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={isMobile ? false : {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="dayGridMonth"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={fetchEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventChange}
          eventResize={handleEventChange}
          timeZone="UTC"
          longPressDelay={300}
          eventClassNames={(arg) => {
            if (arg.event.extendedProps.color) {
              return [`calendar-event-color-${arg.event.extendedProps.color.replace('#', '')}`];
            }
            return [];
          }}
          datesSet={handleDatesSet}
        />
      </div>
      {modalState.isOpen && <EventModal eventInfo={modalState.event} isEditing={modalState.isEditing} onClose={closeModal} calendarRef={calendarRef} />}
    </div>
  );
});

const presetColors = [
  '#3788d8', 
  '#ef4444', 
  '#22c55e', 
  '#2563eb', 
  '#f59e42', 
  '#a855f7', 
  '#fbbf24', 
  '#64748b', 
];

const EventModal = ({ eventInfo, isEditing, onClose, calendarRef }) => {
  const [title, setTitle] = useState(eventInfo.title || '');
  const [description, setDescription] = useState(eventInfo.extendedProps?.description || '');
  const [color, setColor] = useState(eventInfo.color || eventInfo.backgroundColor || '#3788d8');
  const [start, setStart] = useState(eventInfo.start ? new Date(eventInfo.start) : new Date());
  const [end, setEnd] = useState(eventInfo.end ? new Date(eventInfo.end) : new Date());
  const [allDay, setAllDay] = useState(eventInfo.allDay || false);
  const colorInputRef = useRef(null);

  const handleColorClick = (e) => {
    e.preventDefault();
    if (colorInputRef.current) colorInputRef.current.click();
  };

  const handlePresetColor = (preset) => {
    setColor(preset);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      alert('Please provide valid start and end times.');
      return;
    }
    const eventData = {
      title,
      description,
      color,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
    };

    const api = calendarRef.current.getApi();

    if (isEditing) {
      axios.put(`${API_URL}/calendar/events/${eventInfo.id}`, eventData)
        .then(() => {
          api.refetchEvents();
          onClose();
        });
    } else {
      axios.post(`${API_URL}/calendar/events`, eventData)
        .then(() => {
          api.refetchEvents();
          onClose();
        });
    }
  };

  const handleDelete = () => {
    const api = calendarRef.current.getApi();
    axios.delete(`${API_URL}/calendar/events/${eventInfo.id}`)
      .then(() => {
        api.refetchEvents();
        onClose();
      });
  };

  return (
    <div className="event-modal-overlay">
      <div className="event-modal-content">
        <form onSubmit={handleSubmit}>
          <h2 className="event-modal-title">{isEditing ? 'Edit Event' : 'Add Event'}</h2>
          <div className="event-modal-divider" />
          <div className="event-modal-form-group">
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" required className="event-modal-input" />
          </div>
          <div className="event-modal-form-group">
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="event-modal-input" />
          </div>
          <div className="event-modal-form-group color-picker-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label className="color-picker-label" htmlFor="event-color">Event Color</label>
            <input
              id="event-color"
              type="color"
              className="color-picker-input"
              value={color}
              onChange={e => setColor(e.target.value)}
              aria-label="Pick custom color"
            />
          </div>
          <div className="event-modal-form-group preset-color-row">
            {presetColors.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-color-swatch${color === preset ? ' preset-color-swatch-active' : ''}`}
                style={{ background: preset }}
                onClick={() => setColor(preset)}
                aria-label={`Choose color ${preset}`}
              />
            ))}
          </div>
          <div className="event-modal-actions">
            <button type="submit" className="event-modal-btn event-modal-btn-save">{isEditing ? 'Save Changes' : 'Create Event'}</button>
            {isEditing && <button type="button" onClick={handleDelete} className="event-modal-btn event-modal-btn-delete">Delete</button>}
            <button type="button" onClick={onClose} className="event-modal-btn event-modal-btn-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarPage;