import React, { useState } from "react";

const Modal = () => {
    const [open, setOpen] = useState(false);

    const getOpenModal = () => {
        setOpen(true);
    };

    const getCloseModal = () => {
        setOpen(false)
    }

    const ModalComponent = () => {
        return (
            <div className="container animated show">
                <div className="modal">
                    <div className="modal__content">
                        <div className="modal__header">
                            <div className="modal__title">Dialog header</div>
                            <i className="modal__button-close" onClick={getCloseModal}></i>
                        </div>

                        <div className="modal__body">
                            <div className="input-box">
                                <label className="input-box__label" htmlFor="start">
                                    Start time
                                </label>
                                <input
                                    className="input-box__input"
                                    type="date"
                                    placeholder="05.12.2023, 12:00"
                                    id="start"
                                />
                            </div>

                            <div className="input-box">
                                <label className="input-box__label" htmlFor="end">
                                    End time
                                </label>
                                <input
                                    className="input-box__input"
                                    type="date"
                                    placeholder="05.12.2023, 12:00"
                                    id="end"
                                />
                            </div>

                            <div className="input-box">
                                <label className="input-box__label" htmlFor="event">
                                    Event title
                                </label>
                                <input
                                    className="input-box__input"
                                    type="text"
                                    placeholder="Enter event..."
                                    id="event"
                                />
                            </div>
                        </div>

                        <div className="modal__footer">
                            <div className="button__group">
                                <button className="button__secondary">Cancel</button>
                                <button className="button__primary">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        )
    }


    return (
        <>
            <button className="button__primary" onClick={getOpenModal}>Open modal</button>
            {open && <ModalComponent />}
        </>

    );
};
export default Modal;
