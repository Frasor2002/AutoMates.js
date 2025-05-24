;; domain file: domain.pddl
(define (domain default)
    (:requirements :strips)
    (:predicates
        (tile ?t)
        (agent ?a)
        (parcel ?p)
        (at ?agentOrParcel ?tile)
        (right ?t1 ?t2)
        (left ?t1 ?t2)
        (up ?t1 ?t2)
        (down ?t1 ?t2)
        (occupied ?t)
    )

    (:action right
        :parameters (?me ?from ?to)
        :precondition (and
            (tile ?from)
            (tile ?to)
            (agent ?me)
            (at ?me ?from)
            (right ?from ?to)
            (not (occupied ?to))
        )
        :effect (and
            (at ?me ?to)
			(not (at ?me ?from))
            (occupied ?to)
            (not (occupied ?from))
        )
    )

    (:action left
    :parameters (?me ?from ?to)
    :precondition (and
        (tile ?from)
        (tile ?to)
        (agent ?me)
        (at ?me ?from)
        (left ?from ?to)
        (not (occupied ?to))
    )
    :effect (and
        (at ?me ?to)
        (not (at ?me ?from))
        (occupied ?to)
        (not (occupied ?from))
        )
    )

    (:action up
        :parameters (?me ?from ?to)
        :precondition (and
            (tile ?from)
            (tile ?to)
            (agent ?me)
            (at ?me ?from)
            (up ?from ?to)
            (not (occupied ?to))
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
            (occupied ?to)
            (not (occupied ?from))
        )
    )

    (:action down
        :parameters (?me ?from ?to)
        :precondition (and
            (tile ?from)
            (tile ?to)
            (agent ?me)
            (at ?me ?from)
            (down ?from ?to)
            (not (occupied ?to))
        )
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
            (occupied ?to)
            (not (occupied ?from))
        )
    )

    (:action pickup
        :parameters (?me ?p ?t)
        :precondition (and
            (tile ?t)
            (agent ?me)
            (at ?me ?t)
            (at ?p ?t)
            (parcel ?p)
        )
        :effect (and
            (at ?p ?me)
            (not (at ?p ?t))
        )
    )

    (:action putdown
        :parameters (?me ?p ?t)
        :precondition (and
            (tile ?t)
            (agent ?me)
            (at ?me ?t)
            (at ?p ?me)
            (parcel ?p)
        )
        :effect (and
            (at ?p ?t)
            (not (at ?p ?me))
        )
    )

)